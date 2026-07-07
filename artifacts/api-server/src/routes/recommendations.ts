import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  studentProfilesTable,
  clinicalCasesTable,
  caseCompletionsTable,
  attendanceTable,
  schedulesTable,
  scheduleStudentsTable,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// Scoring weights
const WEIGHTS = {
  needsRequiredCase: 40,
  noConflict: 25,
  attendanceAbove95: 20,
  lowerHours: 15,
  highPriorityMakeup: 10,
  moreThan5Late: -20,
  moreThan3Absent: -30,
  alreadyCompletedCase: -40,
};

interface StudentStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string | null;
  yearLevel: number | null;
  section: string | null;
  attendanceRate: number;
  totalHoursCompleted: number;
  needsMakeup: boolean;
  lateCount: number;
  absenceCount: number;
  verifiedCaseCounts: Record<string, number>;
}

async function buildStudentStats(studentId: string): Promise<StudentStats> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, studentId));

  const attendanceRecords = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.studentId, studentId));

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter((a) => a.status === "present" || a.status === "late").length;
  const lateCount = attendanceRecords.filter((a) => a.status === "late").length;
  const absenceCount = attendanceRecords.filter((a) => a.status === "absent").length;
  const needsMakeup = attendanceRecords.some((a) => a.needsMakeup);
  const totalHoursCompleted = attendanceRecords.reduce((s, a) => s + (a.dutyHours ?? 0), 0);
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100;

  const completions = await db
    .select()
    .from(caseCompletionsTable)
    .where(and(eq(caseCompletionsTable.studentId, studentId), eq(caseCompletionsTable.status, "verified")));

  const verifiedCaseCounts: Record<string, number> = {};
  for (const cc of completions) {
    verifiedCaseCounts[cc.clinicalCaseId] = (verifiedCaseCounts[cc.clinicalCaseId] ?? 0) + 1;
  }

  return {
    id: studentId,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    studentNumber: profile?.studentNumber ?? null,
    yearLevel: profile?.yearLevel ?? null,
    section: profile?.section ?? null,
    attendanceRate,
    totalHoursCompleted: Math.round(totalHoursCompleted * 100) / 100,
    needsMakeup,
    lateCount,
    absenceCount,
    verifiedCaseCounts,
  };
}

async function scoreStudent(
  stats: StudentStats,
  targetCaseIds: string[],
  targetCaseRequirements: Record<string, number>,
  scheduleDate?: string,
): Promise<{ score: number; reasons: Array<{ criterion: string; weight: number; applied: boolean; description: string }> }> {
  const reasons: Array<{ criterion: string; weight: number; applied: boolean; description: string }> = [];
  let score = 50;

  // Needs required case
  const needsCase =
    targetCaseIds.length === 0 ||
    targetCaseIds.some((cid) => {
      const required = targetCaseRequirements[cid] ?? 1;
      return (stats.verifiedCaseCounts[cid] ?? 0) < required;
    });
  reasons.push({ criterion: "Needs Required Clinical Case", weight: WEIGHTS.needsRequiredCase, applied: needsCase, description: needsCase ? "Student still needs case exposure in this rotation" : "Student has completed required cases" });
  if (needsCase) score += WEIGHTS.needsRequiredCase;

  // Already completed (penalty)
  const alreadyCompleted = targetCaseIds.length > 0 && !needsCase;
  reasons.push({ criterion: "Already Completed Required Case", weight: WEIGHTS.alreadyCompletedCase, applied: alreadyCompleted, description: alreadyCompleted ? "Student has already completed all required cases" : "Student still has cases to complete" });
  if (alreadyCompleted) score += WEIGHTS.alreadyCompletedCase;

  // No conflict
  let hasConflict = false;
  if (scheduleDate) {
    const conflictLinks = await db
      .select()
      .from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.studentId, stats.id));
    const conflictScheduleIds = conflictLinks.map((l) => l.scheduleId);
    if (conflictScheduleIds.length > 0) {
      for (const sid of conflictScheduleIds) {
        const [sch] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, sid));
        if (sch && sch.dutyDate === scheduleDate && sch.status !== "cancelled") {
          hasConflict = true;
          break;
        }
      }
    }
  }
  reasons.push({ criterion: "No Existing Duty Conflict", weight: WEIGHTS.noConflict, applied: !hasConflict, description: hasConflict ? "Student has another duty on this date" : "Student has no scheduling conflicts" });
  if (!hasConflict) score += WEIGHTS.noConflict;

  // Attendance >= 95%
  const goodAttendance = stats.attendanceRate >= 95;
  reasons.push({ criterion: "Attendance Rate Above 95%", weight: WEIGHTS.attendanceAbove95, applied: goodAttendance, description: `Student attendance rate: ${stats.attendanceRate}%` });
  if (goodAttendance) score += WEIGHTS.attendanceAbove95;

  // Lower hours
  const lowerHours = stats.totalHoursCompleted < 250;
  reasons.push({ criterion: "Lower Completed Duty Hours", weight: WEIGHTS.lowerHours, applied: lowerHours, description: `Student has completed ${stats.totalHoursCompleted.toFixed(1)} hours` });
  if (lowerHours) score += WEIGHTS.lowerHours;

  // Needs makeup
  reasons.push({ criterion: "High Priority Make-up Duty", weight: WEIGHTS.highPriorityMakeup, applied: stats.needsMakeup, description: stats.needsMakeup ? "Student needs a make-up duty" : "Student does not need make-up" });
  if (stats.needsMakeup) score += WEIGHTS.highPriorityMakeup;

  // Too many late
  const tooManyLate = stats.lateCount > 5;
  reasons.push({ criterion: "More than 5 Late Records", weight: WEIGHTS.moreThan5Late, applied: tooManyLate, description: `Student has ${stats.lateCount} late record(s)` });
  if (tooManyLate) score += WEIGHTS.moreThan5Late;

  // Too many absences
  const tooManyAbsent = stats.absenceCount > 3;
  reasons.push({ criterion: "More than 3 Absences", weight: WEIGHTS.moreThan3Absent, applied: tooManyAbsent, description: `Student has ${stats.absenceCount} absence(s)` });
  if (tooManyAbsent) score += WEIGHTS.moreThan3Absent;

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

router.get("/recommendations", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { scheduleId, caseIds } = req.query as { scheduleId?: string; caseIds?: string };

  const targetCaseIds = caseIds ? caseIds.split(",").filter(Boolean) : [];
  let scheduleDate: string | undefined;

  if (scheduleId) {
    const [sch] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
    if (sch) scheduleDate = sch.dutyDate;
  }

  // Fetch required counts for targeted cases
  const targetCaseRequirements: Record<string, number> = {};
  if (targetCaseIds.length > 0) {
    const cases = await db.select().from(clinicalCasesTable);
    for (const c of cases) {
      if (targetCaseIds.includes(c.id)) {
        targetCaseRequirements[c.id] = c.requiredCount;
      }
    }
  }

  const students = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  const recommendations = await Promise.all(
    students.map(async (u) => {
      const stats = await buildStudentStats(u.id);
      const { score, reasons } = await scoreStudent(stats, targetCaseIds, targetCaseRequirements, scheduleDate);
      return { studentId: u.id, score, reasons, student: stats };
    }),
  );

  recommendations.sort((a, b) => b.score - a.score);
  res.json(recommendations);
});

router.get("/recommendations/explanation", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { studentId, scheduleId } = req.query as { studentId?: string; scheduleId?: string };
  if (!studentId) {
    res.status(400).json({ error: "studentId is required" });
    return;
  }

  const [studentUser] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, studentId), eq(usersTable.role, "student")));
  if (!studentUser) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  let scheduleDate: string | undefined;
  if (scheduleId) {
    const [sch] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
    if (sch) scheduleDate = sch.dutyDate;
  }

  const stats = await buildStudentStats(studentId);
  const { score, reasons } = await scoreStudent(stats, [], {}, scheduleDate);

  const appliedReasons = reasons.filter((r) => r.applied && r.weight > 0);
  const appliedPenalties = reasons.filter((r) => r.applied && r.weight < 0);

  const name = `${stats.firstName} ${stats.lastName}`;
  const positives = appliedReasons.map((r) => r.description).join("; ");
  const negatives = appliedPenalties.map((r) => r.description).join("; ");

  let explanation = `${name} is ${score >= 60 ? "recommended" : "not recommended"} with a score of ${score}/100. `;
  if (positives) explanation += `Positive factors: ${positives}. `;
  if (negatives) explanation += `Factors reducing score: ${negatives}.`;
  if (!positives && !negatives) explanation += "No significant factors found.";

  res.json({ studentId, score, explanation });
});

export default router;
