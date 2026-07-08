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
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Face enrollment (face-api.js, client-side embeddings) ────────────────────

import { isValidDescriptor } from "../lib/face-recognition.js";

/**
 * GET /api/students/me/face-descriptor
 * Returns whether the student has a stored face descriptor.
 */
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

/**
 * POST /api/students/me/face-enroll
 * Body: { descriptor: number[] }  — 128-element face embedding from face-api.js
 *
 * Stores the client-computed face descriptor for future verification.
 * Re-enrollment simply overwrites the stored descriptor.
 */
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

  const students = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const profiles = await Promise.all(
    students.map(async (s) => {
      const [profile] = await db
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, s.id));
      const { passwordHash: _pw, ...safe } = s;
      return { ...safe, studentProfile: profile ?? null };
    }),
  );

  if (search) {
    const q = search.toLowerCase();
    return void res.json(
      profiles.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.studentProfile?.studentNumber?.toLowerCase().includes(q),
      ),
    );
  }

  res.json(profiles);
});

// ── Clinical Passport (Ward / Duty-Day based) ─────────────────────────────────

router.get("/students/:id/passport", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  // Students can only view their own passport
  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Fetch all active departments that have duty day requirements
  const allDepts = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.isActive, true));

  // Include all departments with requiredDutyDays > 0
  const wardDepts = allDepts.filter(d => d.requiredDutyDays > 0);

  // Count officially-verified duty verifications per department for this student
  const verifiedDuties = await db
    .select()
    .from(dutyVerificationsTable)
    .where(
      and(
        eq(dutyVerificationsTable.studentId, id),
        eq(dutyVerificationsTable.status, "officially_verified"),
      ),
    );

  // Fetch all active clinical cases for case-based progress
  const allCases = await db
    .select()
    .from(clinicalCasesTable)
    .where(eq(clinicalCasesTable.isActive, true));

  // Fetch verified case completions for this student
  const verifiedCompletions = await db
    .select()
    .from(caseCompletionsTable)
    .where(
      and(
        eq(caseCompletionsTable.studentId, id),
        eq(caseCompletionsTable.status, "verified"),
      ),
    );

  // Build per-ward progress
  const wards = wardDepts.map(dept => {
    const completedDutyDays = verifiedDuties.filter(
      dv => dv.departmentId === dept.id,
    ).length;

    const completedDutyHours = completedDutyDays *
      (dept.requiredDutyDays > 0 ? dept.requiredDutyHours / dept.requiredDutyDays : 0);

    // Cases for this ward: match by case category === department name
    const wardCases = allCases.filter(
      c => c.category.toLowerCase() === dept.name.toLowerCase(),
    );

    const requiredCases = wardCases.map(c => {
      const verified = verifiedCompletions.filter(
        cc => cc.clinicalCaseId === c.id && cc.departmentId === dept.id,
      ).length;
      const remaining = Math.max(0, c.requiredCount - verified);
      const status: "complete" | "in_progress" | "deficient" =
        verified >= c.requiredCount ? "complete"
        : verified > 0 ? "in_progress"
        : "deficient";
      return {
        caseId: c.id,
        caseName: c.name,
        required: c.requiredCount,
        verified,
        remaining,
        status,
      };
    });

    const daysPct = dept.requiredDutyDays > 0
      ? Math.min(1, completedDutyDays / dept.requiredDutyDays)
      : 0;

    // If ward has required cases, completion is limited by both days and cases
    let completionPct = daysPct;
    if (requiredCases.length > 0) {
      const totalCasesRequired = requiredCases.reduce((s, c) => s + c.required, 0);
      const totalCasesVerified = requiredCases.reduce((s, c) => s + c.verified, 0);
      const casesPct = totalCasesRequired > 0
        ? Math.min(1, totalCasesVerified / totalCasesRequired)
        : 1;
      completionPct = Math.min(daysPct, casesPct);
    }

    const status: "complete" | "in_progress" | "not_started" =
      completionPct >= 1 ? "complete"
      : completedDutyDays > 0 ? "in_progress"
      : "not_started";

    return {
      departmentId: dept.id,
      wardName: dept.name,
      requiredDutyDays: dept.requiredDutyDays,
      completedDutyDays,
      requiredDutyHours: dept.requiredDutyHours,
      completedDutyHours: Math.round(completedDutyHours * 10) / 10,
      completionPct: Math.round(completionPct * 100),
      status,
      requiredCases,
    };
  });

  // Overall completion = avg across all wards weighted by required days
  const totalRequired = wardDepts.reduce((s, d) => s + d.requiredDutyDays, 0);
  const totalCompleted = wards.reduce((s, w) => s + Math.min(w.completedDutyDays, w.requiredDutyDays), 0);
  const overallCompletion = totalRequired > 0 ? totalCompleted / totalRequired : 0;

  res.json({
    studentId: id,
    totalDutyDaysRequired: totalRequired,
    totalDutyDaysCompleted: totalCompleted,
    overallCompletion,
    wards,
  });
});

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
