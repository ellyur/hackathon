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
import { eq, and, count, sql, desc, inArray } from "drizzle-orm";
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

  const matrix = await Promise.all(
    students.map(async (s) => {
      const completions = await db
        .select()
        .from(caseCompletionsTable)
        .where(
          and(eq(caseCompletionsTable.studentId, s.id), eq(caseCompletionsTable.status, "verified")),
        );

      const countMap: Record<string, number> = {};
      for (const cc of completions) {
        countMap[cc.clinicalCaseId] = (countMap[cc.clinicalCaseId] ?? 0) + 1;
      }

      const gaps = cases
        .filter((c) => (countMap[c.id] ?? 0) < c.requiredCount)
        .map((c) => ({
          caseId: c.id,
          caseName: c.name,
          required: c.requiredCount,
          completed: countMap[c.id] ?? 0,
          remaining: c.requiredCount - (countMap[c.id] ?? 0),
        }));

      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        gaps,
      };
    }),
  );

  res.json(matrix);
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
        .where(eq(schedulesTable.hospitalId, h.id));

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
        totalSchedules: Number(scheduleCount),
        totalStudentAssignments: studentCount,
      };
    }),
  );

  res.json(utilization);
});

export default router;
