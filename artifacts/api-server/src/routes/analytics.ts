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
} from "@workspace/db";
import { eq, and, count, sql, desc, inArray, gte, not } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/analytics/overview", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const [{ totalStudents }] = await db
    .select({ totalStudents: count() })
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  const [{ activeSchedules }] = await db
    .select({ activeSchedules: count() })
    .from(schedulesTable)
    .where(eq(schedulesTable.status, "active"));

  const [{ totalAttendance }] = await db
    .select({ totalAttendance: count() })
    .from(attendanceTable);

  const [{ presentCount }] = await db
    .select({ presentCount: count() })
    .from(attendanceTable)
    .where(
      sql`${attendanceTable.status} IN ('present', 'late')`,
    );

  const attendanceRate =
    Number(totalAttendance) > 0
      ? Math.round((Number(presentCount) / Number(totalAttendance)) * 100)
      : 100;

  const [{ totalCases }] = await db
    .select({ totalCases: count() })
    .from(caseCompletionsTable)
    .where(eq(caseCompletionsTable.status, "verified"));

  res.json({
    totalStudents: Number(totalStudents),
    activeRotations: Number(activeSchedules),
    attendanceRate,
    verifiedCases: Number(totalCases),
  });
});

router.get("/analytics/students-at-risk", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const students = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  const atRisk = await Promise.all(
    students.map(async (s) => {
      const [{ absences }] = await db
        .select({ absences: count() })
        .from(attendanceTable)
        .where(and(eq(attendanceTable.studentId, s.id), eq(attendanceTable.status, "absent")));

      const [{ verified }] = await db
        .select({ verified: count() })
        .from(caseCompletionsTable)
        .where(
          and(eq(caseCompletionsTable.studentId, s.id), eq(caseCompletionsTable.status, "verified")),
        );

      const risk = Number(absences) >= 3 || Number(verified) < 5;
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        absences: Number(absences),
        verifiedCases: Number(verified),
        isAtRisk: risk,
      };
    }),
  );

  res.json(atRisk.filter((s) => s.isAtRisk));
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
