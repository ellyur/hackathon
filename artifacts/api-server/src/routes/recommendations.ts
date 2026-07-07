import { Router, type IRouter } from "express";
import {
  users, clinicalCases, caseCompletions, attendance, schedules,
  buildStudentDetail,
} from "../lib/mockData.js";
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

function scoreStudent(
  studentId: string,
  targetCaseIds: string[],
  scheduleDate?: string
): { score: number; reasons: Array<{ criterion: string; weight: number; applied: boolean; description: string }> } {
  const student = buildStudentDetail(users.find((u) => u.id === studentId)!);
  const reasons: Array<{ criterion: string; weight: number; applied: boolean; description: string }> = [];

  let score = 50; // Base score

  // Needs required case
  const needsCase = targetCaseIds.some((cid) => {
    const c = clinicalCases.find((cc) => cc.id === cid);
    if (!c) return false;
    const verified = caseCompletions.filter(
      (cc) => cc.studentId === studentId && cc.clinicalCaseId === cid && cc.status === "verified"
    ).length;
    return verified < c.requiredCount;
  });
  reasons.push({ criterion: "Needs Required Clinical Case", weight: WEIGHTS.needsRequiredCase, applied: needsCase, description: needsCase ? "Student still needs case exposure in this rotation" : "Student has completed required cases" });
  if (needsCase) score += WEIGHTS.needsRequiredCase;

  // Already completed case (penalty)
  const alreadyCompleted = targetCaseIds.length > 0 && !needsCase;
  reasons.push({ criterion: "Already Completed Required Case", weight: WEIGHTS.alreadyCompletedCase, applied: alreadyCompleted, description: alreadyCompleted ? "Student has already completed all required cases" : "Student still has cases to complete" });
  if (alreadyCompleted) score += WEIGHTS.alreadyCompletedCase;

  // No conflict (simplified: check if student is assigned to another schedule on same date)
  let hasConflict = false;
  if (scheduleDate) {
    hasConflict = schedules.some((s) => s.dutyDate === scheduleDate && s.studentIds.includes(studentId) && s.status !== "cancelled");
  }
  reasons.push({ criterion: "No Existing Duty Conflict", weight: WEIGHTS.noConflict, applied: !hasConflict, description: hasConflict ? "Student has another duty on this date" : "Student has no scheduling conflicts" });
  if (!hasConflict) score += WEIGHTS.noConflict;

  // Attendance above 95%
  const goodAttendance = student.attendanceRate >= 95;
  reasons.push({ criterion: "Attendance Rate Above 95%", weight: WEIGHTS.attendanceAbove95, applied: goodAttendance, description: `Student attendance rate: ${student.attendanceRate}%` });
  if (goodAttendance) score += WEIGHTS.attendanceAbove95;

  // Lower hours (compared to 250 midpoint)
  const lowerHours = student.totalHoursCompleted < 250;
  reasons.push({ criterion: "Lower Completed Duty Hours", weight: WEIGHTS.lowerHours, applied: lowerHours, description: `Student has completed ${student.totalHoursCompleted.toFixed(1)} hours` });
  if (lowerHours) score += WEIGHTS.lowerHours;

  // High priority makeup
  const needsMakeup = student.needsMakeup;
  reasons.push({ criterion: "High Priority Make-up Duty", weight: WEIGHTS.highPriorityMakeup, applied: needsMakeup, description: needsMakeup ? "Student needs a make-up duty" : "Student does not need make-up" });
  if (needsMakeup) score += WEIGHTS.highPriorityMakeup;

  // More than 5 late (penalty)
  const tooManyLate = student.lateCount > 5;
  reasons.push({ criterion: "More than 5 Late Records", weight: WEIGHTS.moreThan5Late, applied: tooManyLate, description: `Student has ${student.lateCount} late record(s)` });
  if (tooManyLate) score += WEIGHTS.moreThan5Late;

  // More than 3 absences (penalty)
  const tooManyAbsent = student.absenceCount > 3;
  reasons.push({ criterion: "More than 3 Absences", weight: WEIGHTS.moreThan3Absent, applied: tooManyAbsent, description: `Student has ${student.absenceCount} absence(s)` });
  if (tooManyAbsent) score += WEIGHTS.moreThan3Absent;

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

router.get("/recommendations", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { scheduleId, slotId, caseIds } = req.query as {
    scheduleId?: string; slotId?: string; caseIds?: string;
  };

  const targetCaseIds = caseIds ? caseIds.split(",") : [];
  let scheduleDate: string | undefined;

  if (scheduleId) {
    const sch = schedules.find((s) => s.id === scheduleId);
    if (sch) scheduleDate = sch.dutyDate;
  }

  const studentUsers = users.filter((u) => u.role === "student" && u.isActive);

  const recommendations = studentUsers.map((u) => {
    const { score, reasons } = scoreStudent(u.id, targetCaseIds, scheduleDate);
    return {
      studentId: u.id,
      score,
      reasons,
      student: buildStudentDetail(u),
    };
  });

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  res.json(recommendations);
});

router.get("/recommendations/explanation", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { studentId, scheduleId, slotId } = req.query as { studentId?: string; scheduleId?: string; slotId?: string };
  if (!studentId) {
    res.status(400).json({ error: "studentId is required" });
    return;
  }

  const studentUser = users.find((u) => u.id === studentId && u.role === "student");
  if (!studentUser) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const student = buildStudentDetail(studentUser);
  const schedule = scheduleId ? schedules.find((s) => s.id === scheduleId) : undefined;
  const { score, reasons } = scoreStudent(studentId, [], schedule?.dutyDate);

  const appliedReasons = reasons.filter((r) => r.applied && r.weight > 0);
  const appliedPenalties = reasons.filter((r) => r.applied && r.weight < 0);

  const name = `${student.firstName} ${student.lastName}`;
  const positives = appliedReasons.map((r) => r.description).join("; ");
  const negatives = appliedPenalties.map((r) => r.description).join("; ");

  let explanation = `${name} is ${score >= 60 ? "recommended" : "not recommended"} with a score of ${score}/100. `;
  if (positives) explanation += `Positive factors: ${positives}. `;
  if (negatives) explanation += `Factors reducing score: ${negatives}.`;
  if (!positives && !negatives) explanation += "No significant factors found.";

  res.json({ studentId, score, explanation });
});

export default router;
