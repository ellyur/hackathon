import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  schedulesTable,
  scheduleStudentsTable,
  attendanceTable,
  caseCompletionsTable,
  clinicalCasesTable,
  hospitalsTable,
  studentProfilesTable,
} from "@workspace/db";
import { eq, and, count, sum, sql, desc, inArray, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/analytics/overview", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const [
    [{ totalStudents }],
    [{ activeSchedules }],
    [{ upcomingSchedules }],
    [{ totalHospitals }],
    [{ totalAttendance }],
    [{ presentCount }],
    [{ verifiedCases }],
    [{ totalRequired }],
    [{ pendingVerifications }],
    [{ studentsNeedingMakeup }],
  ] = await Promise.all([
    db.select({ totalStudents: count() }).from(usersTable)
      .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true))),
    db.select({ activeSchedules: count() }).from(schedulesTable)
      .where(eq(schedulesTable.status, "active")),
    db.select({ upcomingSchedules: count() }).from(schedulesTable)
      .where(eq(schedulesTable.status, "upcoming")),
    db.select({ totalHospitals: count() }).from(hospitalsTable)
      .where(eq(hospitalsTable.isActive, true)),
    db.select({ totalAttendance: count() }).from(attendanceTable),
    db.select({ presentCount: count() }).from(attendanceTable)
      .where(sql`${attendanceTable.status} IN ('present', 'late')`),
    db.select({ verifiedCases: count() }).from(caseCompletionsTable)
      .where(eq(caseCompletionsTable.status, "verified")),
    db.select({ totalRequired: sql<number>`COALESCE(SUM(${clinicalCasesTable.requiredCount}), 0)` })
      .from(clinicalCasesTable).where(eq(clinicalCasesTable.isActive, true)),
    db.select({ pendingVerifications: count() }).from(caseCompletionsTable)
      .where(eq(caseCompletionsTable.status, "pending")),
    db.select({ studentsNeedingMakeup: sql<number>`COUNT(DISTINCT ${attendanceTable.studentId})` })
      .from(attendanceTable)
      .where(and(eq(attendanceTable.needsMakeup, true), eq(attendanceTable.makeupCompleted, false))),
  ]);

  const ta = Number(totalAttendance);
  const attendanceRate = ta > 0 ? Number(presentCount) / ta : 1;

  // completionRate = verified / (students × required-per-student), clamped to [0, 1]
  const totalStudentsNum = Number(totalStudents);
  const totalRequiredNum = Number(totalRequired);
  const cohortCapacity = totalStudentsNum * totalRequiredNum;
  const completionRate = cohortCapacity > 0
    ? Math.min(1, Number(verifiedCases) / cohortCapacity)
    : 0;

  res.json({
    totalStudents: Number(totalStudents),
    activeRotations: Number(activeSchedules),
    completionRate,
    attendanceRate,
    totalHospitals: Number(totalHospitals),
    pendingVerifications: Number(pendingVerifications),
    studentsNeedingMakeup: Number(studentsNeedingMakeup),
    upcomingDutiesCount: Number(upcomingSchedules),
  });
});

router.get("/analytics/students-at-risk", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const students = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  if (students.length === 0) {
    res.json([]);
    return;
  }

  const studentIds = students.map((s) => s.id);

  // Fetch profiles, absences, late counts, verified cases, duty hours, and total required in parallel
  const [profiles, absenceRows, lateRows, verifiedRows, hoursRows, totalCasesRow] = await Promise.all([
    db.select().from(studentProfilesTable).where(inArray(studentProfilesTable.userId, studentIds)),
    db.select({ studentId: attendanceTable.studentId, cnt: count() })
      .from(attendanceTable)
      .where(and(inArray(attendanceTable.studentId, studentIds), eq(attendanceTable.status, "absent")))
      .groupBy(attendanceTable.studentId),
    db.select({ studentId: attendanceTable.studentId, cnt: count() })
      .from(attendanceTable)
      .where(and(inArray(attendanceTable.studentId, studentIds), eq(attendanceTable.status, "late")))
      .groupBy(attendanceTable.studentId),
    db.select({ studentId: caseCompletionsTable.studentId, cnt: count() })
      .from(caseCompletionsTable)
      .where(and(inArray(caseCompletionsTable.studentId, studentIds), eq(caseCompletionsTable.status, "verified")))
      .groupBy(caseCompletionsTable.studentId),
    db.select({ studentId: attendanceTable.studentId, totalHours: sum(attendanceTable.dutyHours) })
      .from(attendanceTable)
      .where(and(inArray(attendanceTable.studentId, studentIds), sql`${attendanceTable.dutyHours} IS NOT NULL`))
      .groupBy(attendanceTable.studentId),
    db.select({ totalRequired: sql<number>`COALESCE(SUM(${clinicalCasesTable.requiredCount}), 1)` })
      .from(clinicalCasesTable).where(eq(clinicalCasesTable.isActive, true)),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const absenceMap = new Map(absenceRows.map((r) => [r.studentId, Number(r.cnt)]));
  const lateMap = new Map(lateRows.map((r) => [r.studentId, Number(r.cnt)]));
  const verifiedMap = new Map(verifiedRows.map((r) => [r.studentId, Number(r.cnt)]));
  const hoursMap = new Map(hoursRows.map((r) => [r.studentId, Math.round(Number(r.totalHours ?? 0) * 100) / 100]));
  const totalRequired = Math.max(1, Number(totalCasesRow[0]?.totalRequired ?? 1));

  const atRisk = students
    .map((s) => {
      const profile = profileMap.get(s.id);
      const absenceCount = absenceMap.get(s.id) ?? 0;
      const lateCount = lateMap.get(s.id) ?? 0;
      const verifiedCount = verifiedMap.get(s.id) ?? 0;
      const hoursRequired = profile?.totalHoursRequired ?? 500;

      const caseCompletionRate = verifiedCount / totalRequired;
      // Risk score: weighted sum of absence rate (60%) + case incompletion (40%), capped at 1
      const absenceScore = Math.min(absenceCount / 5, 1);
      const caseScore = Math.max(0, 1 - caseCompletionRate);
      const riskScore = Math.min(1, absenceScore * 0.6 + caseScore * 0.4);

      const isAtRisk = absenceCount >= 3 || caseCompletionRate < 0.5;
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarUrl: s.avatarUrl ?? null,
        riskScore: Math.round(riskScore * 100) / 100,
        absenceCount,
        lateCount,
        caseCompletionRate: Math.round(caseCompletionRate * 100) / 100,
        hoursCompleted: hoursMap.get(s.id) ?? 0,
        hoursRequired,
        isAtRisk,
      };
    })
    .filter((s) => s.isAtRisk);

  res.json(atRisk);
});

router.get("/analytics/case-gaps", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const students = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  const cases = await db
    .select()
    .from(clinicalCasesTable)
    .where(eq(clinicalCasesTable.isActive, true));

  const allCompletions = await db
    .select()
    .from(caseCompletionsTable)
    .where(
      and(
        eq(caseCompletionsTable.status, "verified"),
        inArray(caseCompletionsTable.studentId, students.map((s) => s.id)),
      ),
    );

  // Build flat gaps array: one entry per (student, case) pair where remaining > 0
  const gaps: Array<{ studentId: string; caseId: string; completed: number; required: number; remaining: number }> = [];
  for (const student of students) {
    const countMap: Record<string, number> = {};
    for (const cc of allCompletions.filter((c) => c.studentId === student.id)) {
      countMap[cc.clinicalCaseId] = (countMap[cc.clinicalCaseId] ?? 0) + 1;
    }
    for (const c of cases) {
      const completed = countMap[c.id] ?? 0;
      if (completed < c.requiredCount) {
        gaps.push({
          studentId: student.id,
          caseId: c.id,
          completed,
          required: c.requiredCount,
          remaining: c.requiredCount - completed,
        });
      }
    }
  }

  // Strip passwordHash from student users before returning
  const safeStudents = students.map(({ passwordHash: _pw, ...s }) => s);

  res.json({ cases, students: safeStudents, gaps });
});

router.get("/analytics/attendance-trend", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(${attendanceTable.createdAt}, 'YYYY-MM')`,
      status: attendanceTable.status,
      count: count(),
    })
    .from(attendanceTable)
    .groupBy(
      sql`TO_CHAR(${attendanceTable.createdAt}, 'YYYY-MM')`,
      attendanceTable.status,
    )
    .orderBy(sql`TO_CHAR(${attendanceTable.createdAt}, 'YYYY-MM')`);

  // Pivot by month
  const byMonth: Record<string, { month: string; present: number; late: number; absent: number }> = {};
  for (const row of rows) {
    if (!byMonth[row.month]) byMonth[row.month] = { month: row.month, present: 0, late: 0, absent: 0 };
    if (row.status === "present") byMonth[row.month].present = Number(row.count);
    if (row.status === "late") byMonth[row.month].late = Number(row.count);
    if (row.status === "absent") byMonth[row.month].absent = Number(row.count);
  }

  res.json(Object.values(byMonth));
});

router.get("/analytics/hospital-utilization", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const hospitals = await db.select().from(hospitalsTable).where(eq(hospitalsTable.isActive, true));

  const utilization = await Promise.all(
    hospitals.map(async (h) => {
      const [{ scheduleCount }] = await db
        .select({ scheduleCount: count() })
        .from(schedulesTable)
        .where(and(eq(schedulesTable.hospitalId, h.id), eq(schedulesTable.status, "active")));

      const schedulesForHospital = await db
        .select({ id: schedulesTable.id })
        .from(schedulesTable)
        .where(eq(schedulesTable.hospitalId, h.id));

      const scheduleIds = schedulesForHospital.map((s) => s.id);
      let studentCount = 0;
      if (scheduleIds.length > 0) {
        const [{ cnt }] = await db
          .select({ cnt: count() })
          .from(scheduleStudentsTable)
          .where(inArray(scheduleStudentsTable.scheduleId, scheduleIds));
        studentCount = Number(cnt);
      }

      return {
        hospitalId: h.id,
        hospitalName: h.name,
        activeRotations: Number(scheduleCount),
        studentCount,
      };
    }),
  );

  res.json(utilization);
});

router.get("/analytics/makeup-queue", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  // Find absence records in the last 60 days where makeup is not yet completed
  const absences = await db
    .select({
      studentId: attendanceTable.studentId,
      scheduleId: attendanceTable.scheduleId,
      absenceDate: attendanceTable.createdAt,
    })
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.status, "absent"),
        eq(attendanceTable.needsMakeup, true),
        eq(attendanceTable.makeupCompleted, false),
        gte(attendanceTable.createdAt, since),
      ),
    )
    .orderBy(desc(attendanceTable.createdAt));

  if (absences.length === 0) {
    res.json([]);
    return;
  }

  const studentIds = [...new Set(absences.map((a) => a.studentId))];
  const studentRows = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, studentIds));

  const studentMap = new Map(studentRows.map((s) => [s.id, s]));
  const now = Date.now();

  const queue = absences.map((a) => {
    const student = studentMap.get(a.studentId);
    const absenceDate = a.absenceDate instanceof Date ? a.absenceDate : new Date(a.absenceDate);
    const daysSinceAbsence = Math.floor((now - absenceDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      studentId: a.studentId,
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      avatarUrl: student?.avatarUrl ?? null,
      absenceDate: absenceDate.toISOString().slice(0, 10),
      scheduleId: a.scheduleId,
      daysSinceAbsence,
    };
  }).sort((a, b) => b.daysSinceAbsence - a.daysSinceAbsence);

  res.json(queue);
});

export default router;
