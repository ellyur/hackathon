import { Router, type IRouter } from "express";
import {
  users, hospitals, schedules, attendance, caseCompletions, clinicalCases,
  dutyApplications, buildStudentDetail,
} from "../lib/mockData.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/analytics/overview", requireAuth, async (_req, res): Promise<void> => {
  const totalStudents = users.filter((u) => u.role === "student" && u.isActive).length;
  const activeRotations = schedules.filter((s) => s.status === "active" || s.status === "upcoming").length;
  const totalHospitals = hospitals.filter((h) => h.isActive).length;
  const pendingVerifications = caseCompletions.filter((cc) => cc.status === "pending").length;
  const studentsNeedingMakeup = attendance.filter((a) => a.needsMakeup && !a.makeupCompleted).length;
  const upcomingDutiesCount = schedules.filter((s) => s.status === "upcoming").length;

  const studentIds = users.filter((u) => u.role === "student").map((u) => u.id);
  const totalVerified = caseCompletions.filter((cc) => cc.status === "verified").length;
  const totalRequired = clinicalCases.filter((c) => c.isActive).reduce((s, c) => s + c.requiredCount, 0) * studentIds.length;
  const completionRate = totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0;

  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;

  res.json({
    totalStudents,
    activeRotations,
    completionRate,
    attendanceRate,
    totalHospitals,
    pendingVerifications,
    studentsNeedingMakeup,
    upcomingDutiesCount,
  });
});

router.get("/analytics/students-at-risk", requireAuth, async (_req, res): Promise<void> => {
  const studentUsers = users.filter((u) => u.role === "student" && u.isActive);
  const atRisk = studentUsers
    .map((u) => {
      const detail = buildStudentDetail(u);
      const riskScore = (detail.absenceCount * 20) + (Math.max(0, 30 - detail.caseCompletionRate)) + (Math.max(0, 50 - detail.totalHoursCompleted / 10));
      return {
        studentId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        riskScore: Math.round(riskScore),
        absenceCount: detail.absenceCount,
        lateCount: detail.lateCount,
        caseCompletionRate: detail.caseCompletionRate,
        hoursCompleted: detail.totalHoursCompleted,
        hoursRequired: detail.totalHoursRequired,
      };
    })
    .filter((s) => s.riskScore > 10)
    .sort((a, b) => b.riskScore - a.riskScore);

  res.json(atRisk);
});

router.get("/analytics/case-gaps", requireAuth, async (_req, res): Promise<void> => {
  const activeCases = clinicalCases.filter((c) => c.isActive);
  const studentUsers = users.filter((u) => u.role === "student" && u.isActive);

  const gaps = studentUsers.flatMap((u) =>
    activeCases.map((c) => {
      const verified = caseCompletions.filter(
        (cc) => cc.studentId === u.id && cc.clinicalCaseId === c.id && cc.status === "verified"
      ).length;
      return {
        studentId: u.id,
        caseId: c.id,
        completed: verified,
        required: c.requiredCount,
        remaining: Math.max(0, c.requiredCount - verified),
      };
    })
  );

  res.json({
    cases: activeCases,
    students: studentUsers.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, isActive: u.isActive, avatarUrl: u.avatarUrl })),
    gaps,
  });
});

router.get("/analytics/attendance-trend", requireAuth, async (_req, res): Promise<void> => {
  // Mock monthly data for the last 6 months
  const months = [
    { month: "Feb 2025", present: 18, late: 4, absent: 2 },
    { month: "Mar 2025", present: 22, late: 3, absent: 1 },
    { month: "Apr 2025", present: 20, late: 5, absent: 3 },
    { month: "May 2025", present: 25, late: 2, absent: 1 },
    { month: "Jun 2025", present: 24, late: 3, absent: 2 },
    { month: "Jul 2025", present: 8, late: 2, absent: 1 },
  ];
  res.json(months);
});

router.get("/analytics/hospital-utilization", requireAuth, async (_req, res): Promise<void> => {
  const result = hospitals.filter((h) => h.isActive).map((h) => {
    const hospitalSchedules = schedules.filter((s) => s.hospitalId === h.id);
    const studentIds = new Set(hospitalSchedules.flatMap((s) => s.studentIds));
    const activeRotations = hospitalSchedules.filter((s) => s.status === "active" || s.status === "upcoming").length;
    return {
      hospitalId: h.id,
      hospitalName: h.name,
      studentCount: studentIds.size,
      activeRotations,
    };
  });
  res.json(result);
});

router.get("/analytics/makeup-queue", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const needsMakeup = attendance.filter((a) => a.needsMakeup && !a.makeupCompleted);
  const result = needsMakeup.map((a) => {
    const student = users.find((u) => u.id === a.studentId);
    const schedule = schedules.find((s) => s.id === a.scheduleId);
    const absenceDate = schedule?.dutyDate ?? a.createdAt.split("T")[0];
    const daysSince = Math.floor((now.getTime() - new Date(absenceDate).getTime()) / 86400000);
    return {
      studentId: a.studentId,
      firstName: student?.firstName ?? "Unknown",
      lastName: student?.lastName ?? "",
      avatarUrl: student?.avatarUrl ?? null,
      absenceDate,
      scheduleId: a.scheduleId,
      daysSinceAbsence: daysSince,
    };
  });
  result.sort((a, b) => b.daysSinceAbsence - a.daysSinceAbsence);
  res.json(result);
});

router.get("/analytics/today-duties", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  // Include nearby dates for demo (since mock data is fixed dates)
  const result = schedules
    .filter((s) => s.status !== "cancelled")
    .slice(0, 3);
  const { buildScheduleResponse } = await import("../lib/mockData.js");
  res.json(result.map(buildScheduleResponse));
});

router.get("/analytics/pending-verifications", requireAuth, async (_req, res): Promise<void> => {
  const pending = caseCompletions.filter((cc) => cc.status === "pending").length;
  const verified = caseCompletions.filter((cc) => cc.status === "verified").length;
  const rejected = caseCompletions.filter((cc) => cc.status === "rejected").length;
  res.json({
    total: pending,
    byStatus: { pending, verified, rejected },
  });
});

export default router;
