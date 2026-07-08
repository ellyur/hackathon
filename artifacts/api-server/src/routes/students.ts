import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  studentProfilesTable,
  attendanceTable,
  caseCompletionsTable,
  clinicalCasesTable,
  departmentsTable,
  dutyVerificationsTable,
  dutyVerificationCasesTable,
  schedulesTable,
  academicYearSettingsTable,
} from "@workspace/db";
import { eq, and, sql, inArray, sum } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Face enrollment ────────────────────────────────────────────────────────────

import { isValidDescriptor } from "../lib/face-recognition.js";

router.get("/students/me/face-descriptor", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.session.userId!));

  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  res.json({ enrolled: Array.isArray(profile.faceDescriptor) && profile.faceDescriptor.length === 128 });
});

router.post("/students/me/face-enroll", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { descriptor } = req.body as { descriptor?: unknown };

  if (!isValidDescriptor(descriptor)) {
    res.status(400).json({ error: "descriptor must be an array of 128 finite numbers" });
    return;
  }

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.session.userId!));

  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  try {
    await db
      .update(studentProfilesTable)
      .set({ faceDescriptor: descriptor })
      .where(eq(studentProfilesTable.userId, req.session.userId!));

    res.json({ enrolled: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Face enrollment failed: ${msg}` });
  }
});

// ── Student list ──────────────────────────────────────────────────────────────

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as { search?: string };

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const withProfiles = await Promise.all(
    users.map(async (u) => {
      const [profile] = await db
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, u.id));
      return { ...u, studentProfile: profile ?? null };
    }),
  );

  const filtered = search
    ? withProfiles.filter(
        (u) =>
          u.firstName.toLowerCase().includes(search.toLowerCase()) ||
          u.lastName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : withProfiles;

  res.json(filtered);
});

// ── Student profile ────────────────────────────────────────────────────────────

router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user || user.role !== "student") {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, id));

  res.json({ ...user, studentProfile: profile ?? null });
});

// ── Clinical Passport ──────────────────────────────────────────────────────────

router.get("/students/:id/passport", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // ── Duty Hours (independent of Clinical Cases) ─────────────────────────────
  // Earned: sum attendance.dutyHours for all completed attendance records for this student.
  const [earnedResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${attendanceTable.dutyHours}), 0)` })
    .from(attendanceTable)
    .where(eq(attendanceTable.studentId, id));
  const earnedDutyHours = Math.round(Number(earnedResult?.total ?? 0) * 100) / 100;

  // Required: look up academic year settings for the student's current academic year.
  // Falls back to student_profiles.totalHoursRequired if no setting is configured.
  const [profile] = await db
    .select({ academicYear: studentProfilesTable.academicYear, totalHoursRequired: studentProfilesTable.totalHoursRequired })
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, id));

  let requiredDutyHours = profile?.totalHoursRequired ?? 500;
  if (profile?.academicYear) {
    // When multiple semester rows exist for the same school year, use the maximum
    // configured total (most conservative/complete requirement). This is deterministic
    // and handles years where one semester may have higher requirements than another.
    const settingsForYear = await db
      .select()
      .from(academicYearSettingsTable)
      .where(eq(academicYearSettingsTable.schoolYear, profile.academicYear));
    if (settingsForYear.length > 0) {
      requiredDutyHours = Math.max(...settingsForYear.map(s => s.requiredTotalDutyHours));
    }
  }

  const dutyHoursPct = requiredDutyHours > 0
    ? Math.min(1, earnedDutyHours / requiredDutyHours)
    : 0;

  // ── Clinical Cases by Ward (independent of Duty Hours) ─────────────────────
  const [allDepts, allCases, verifiedDuties] = await Promise.all([
    db.select().from(departmentsTable).where(eq(departmentsTable.isActive, true)),
    db.select().from(clinicalCasesTable).where(eq(clinicalCasesTable.isActive, true)),
    db.select().from(dutyVerificationsTable).where(
      and(
        eq(dutyVerificationsTable.studentId, id),
        eq(dutyVerificationsTable.status, "officially_verified"),
      ),
    ),
  ]);

  // Include wards that have duty day requirements OR have clinical cases assigned
  const wardDepts = allDepts.filter(
    d => d.requiredDutyDays > 0 ||
         allCases.some(c => c.category.toLowerCase() === d.name.toLowerCase()),
  );

  const verifiedCompletions = await db
    .select()
    .from(caseCompletionsTable)
    .where(
      and(
        eq(caseCompletionsTable.studentId, id),
        eq(caseCompletionsTable.status, "verified"),
      ),
    );

  const wards = wardDepts.map(dept => {
    // Duty days remain tracked per-ward (for scheduling/verification purposes)
    const completedDutyDays = verifiedDuties.filter(
      dv => dv.departmentId === dept.id,
    ).length;

    // Clinical Cases for this ward — status is INDEPENDENT of duty hours
    const wardCases = allCases.filter(
      c => c.category.toLowerCase() === dept.name.toLowerCase(),
    );

    const requiredCases = wardCases.map(c => {
      const verified = verifiedCompletions.filter(
        cc => cc.clinicalCaseId === c.id && cc.departmentId === dept.id,
      ).length;
      const remaining = Math.max(0, c.requiredCount - verified);
      // Rule: verified case completions NEVER add Duty Hours
      const status: "complete" | "in_progress" | "deficient" =
        verified >= c.requiredCount ? "complete"
        : verified > 0 ? "in_progress"
        : "deficient";
      return {
        caseId: c.id,
        caseName: c.name,
        required: c.requiredCount,
        hourValue: c.hourValue ?? null,
        verified,
        remaining,
        status,
      };
    });

    const daysPct = dept.requiredDutyDays > 0
      ? Math.min(1, completedDutyDays / dept.requiredDutyDays)
      : 1; // No duty-day requirement → that dimension is fully satisfied

    // Ward completion: combine duty-day progress and case progress
    let completionPct = daysPct;
    if (requiredCases.length > 0) {
      const totalCasesRequired = requiredCases.reduce((s, c) => s + c.required, 0);
      const totalCasesVerified = requiredCases.reduce((s, c) => s + c.verified, 0);
      const casesPct = totalCasesRequired > 0
        ? Math.min(1, totalCasesVerified / totalCasesRequired)
        : 1;
      completionPct = Math.min(daysPct, casesPct);
    }

    const anyCaseProgress = requiredCases.some(c => c.verified > 0);
    const status: "complete" | "in_progress" | "not_started" =
      completionPct >= 1 ? "complete"
      : (completedDutyDays > 0 || anyCaseProgress) ? "in_progress"
      : "not_started";

    return {
      departmentId: dept.id,
      wardName: dept.name,
      requiredDutyDays: dept.requiredDutyDays,
      completedDutyDays,
      requiredDutyHours: dept.requiredDutyHours,
      completionPct: Math.round(completionPct * 100),
      status,
      requiredCases,
    };
  });

  // Legacy totals kept for backward compatibility
  const totalRequired = wardDepts.reduce((s, d) => s + d.requiredDutyDays, 0);
  const totalCompleted = wards.reduce((s, w) => s + Math.min(w.completedDutyDays, w.requiredDutyDays), 0);
  const overallCompletion = totalRequired > 0 ? totalCompleted / totalRequired : 0;

  res.json({
    studentId: id,
    // ── Duty Hours (independent track) ─────────
    earnedDutyHours,
    requiredDutyHours,
    dutyHoursCompletion: Math.round(dutyHoursPct * 100),
    // ── Legacy / ward-day fields ────────────────
    totalDutyDaysRequired: totalRequired,
    totalDutyDaysCompleted: totalCompleted,
    overallCompletion,
    // ── Clinical Cases by Ward ──────────────────
    wards,
  });
});

// ── Ward Detail (for Clinical Passport drill-down) ────────────────────────────

router.get("/students/:id/ward-detail/:departmentId", requireAuth, async (req, res): Promise<void> => {
  const { id: studentId, departmentId } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== studentId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId));
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  // Get all schedules for this department (to find attendance records)
  const scheduleList = await db
    .select({
      id: schedulesTable.id,
      dutyDate: schedulesTable.dutyDate,
      startTime: schedulesTable.startTime,
      endTime: schedulesTable.endTime,
    })
    .from(schedulesTable)
    .where(eq(schedulesTable.departmentId, departmentId));

  const scheduleIds = scheduleList.map(s => s.id);
  const scheduleMap = new Map(scheduleList.map(s => [s.id, s]));

  // Attendance records for this student in this ward
  let attendanceHistory: object[] = [];
  if (scheduleIds.length > 0) {
    const records = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.studentId, studentId),
          inArray(attendanceTable.scheduleId, scheduleIds),
        ),
      );

    attendanceHistory = records.map(r => {
      const schedule = scheduleMap.get(r.scheduleId);
      let lateMinutes = 0;
      if ((r.status === "late" || r.status === "present") && r.timeIn && schedule?.startTime) {
        try {
          const scheduledStart = new Date(`${schedule.dutyDate}T${schedule.startTime}:00`);
          const actualTimeIn = new Date(r.timeIn as unknown as string);
          lateMinutes = Math.max(0, Math.floor((actualTimeIn.getTime() - scheduledStart.getTime()) / 60000));
        } catch {
          lateMinutes = 0;
        }
      }
      return {
        id: r.id,
        scheduleId: r.scheduleId,
        dutyDate: schedule?.dutyDate ?? "",
        timeIn: r.timeIn,
        timeOut: r.timeOut,
        status: r.status,
        dutyHours: r.dutyHours,
        lateMinutes,
        gpsVerified: r.gpsVerified,
        faceVerified: r.faceVerified,
      };
    }).sort((a: any, b: any) => (b.dutyDate > a.dutyDate ? 1 : -1));
  }

  // Verification history for this student in this ward
  const verifications = await db
    .select()
    .from(dutyVerificationsTable)
    .where(
      and(
        eq(dutyVerificationsTable.studentId, studentId),
        eq(dutyVerificationsTable.departmentId, departmentId),
      ),
    );

  const verificationHistory = await Promise.all(
    verifications.map(async v => {
      const [ci] = await db
        .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(eq(usersTable.id, v.ciId));

      const selectedCaseRows = await db
        .select({ caseName: clinicalCasesTable.name })
        .from(dutyVerificationCasesTable)
        .leftJoin(clinicalCasesTable, eq(dutyVerificationCasesTable.clinicalCaseId, clinicalCasesTable.id))
        .where(eq(dutyVerificationCasesTable.dutyVerificationId, v.id));

      return {
        id: v.id,
        dutyDate: v.dutyDate,
        status: v.status,
        ciName: ci ? `${ci.firstName} ${ci.lastName}` : v.ciId,
        ciRemarks: v.ciRemarks,
        ciVerifiedAt: v.ciVerifiedAt,
        schedulerConfirmedAt: v.schedulerConfirmedAt,
        selectedCases: selectedCaseRows.map(c => c.caseName).filter(Boolean),
      };
    }),
  );

  verificationHistory.sort((a, b) => (b.dutyDate > a.dutyDate ? 1 : -1));

  // Case progress for this ward
  const wardCases = await db
    .select()
    .from(clinicalCasesTable)
    .where(
      and(
        eq(clinicalCasesTable.isActive, true),
        sql`LOWER(${clinicalCasesTable.category}) = LOWER(${dept.name})`,
      ),
    );

  let caseProgress: object[] = [];
  if (wardCases.length > 0) {
    const caseIds = wardCases.map(c => c.id);
    const completions = await db
      .select()
      .from(caseCompletionsTable)
      .where(
        and(
          eq(caseCompletionsTable.studentId, studentId),
          eq(caseCompletionsTable.status, "verified"),
          inArray(caseCompletionsTable.clinicalCaseId, caseIds),
        ),
      );

    const caseCounts: Record<string, number> = {};
    for (const c of completions) {
      caseCounts[c.clinicalCaseId] = (caseCounts[c.clinicalCaseId] ?? 0) + 1;
    }

    caseProgress = wardCases.map(c => ({
      caseId: c.id,
      caseName: c.name,
      required: c.requiredCount,
      verified: caseCounts[c.id] ?? 0,
      remaining: Math.max(0, c.requiredCount - (caseCounts[c.id] ?? 0)),
    }));
  }

  // Statistics
  const completedDutyDays = verifications.filter(v => v.status === "officially_verified").length;
  const absenceCount = (attendanceHistory as any[]).filter(r => r.status === "absent").length;
  const totalLateMinutes = (attendanceHistory as any[]).reduce((sum, r) => sum + (r.lateMinutes ?? 0), 0);

  res.json({
    departmentId,
    wardName: dept.name,
    requiredDutyDays: dept.requiredDutyDays,
    requiredDutyHours: dept.requiredDutyHours,
    completedDutyDays,
    absenceCount,
    totalLateMinutes,
    attendanceHistory,
    verificationHistory,
    cases: caseProgress,
  });
});

// ── Attendance history ────────────────────────────────────────────────────────

router.get("/students/:id/attendance", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.studentId, id));

  res.json(records);
});

// ── Hours ─────────────────────────────────────────────────────────────────────

router.get("/students/:id/hours", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, id));

  const records = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.studentId, id), sql`${attendanceTable.dutyHours} IS NOT NULL`));

  const hoursCompleted = records.reduce((sum, r) => sum + (r.dutyHours ?? 0), 0);
  const hoursRequired = profile?.totalHoursRequired ?? 500;

  res.json({
    studentId: id,
    totalHoursCompleted: Math.round(hoursCompleted * 100) / 100,
    totalHoursRequired: hoursRequired,
    hoursRemaining: Math.max(0, Math.round((hoursRequired - hoursCompleted) * 100) / 100),
    progressPercent:
      hoursRequired > 0 ? Math.round((hoursCompleted / hoursRequired) * 100 * 10) / 10 : 0,
  });
});

export default router;
