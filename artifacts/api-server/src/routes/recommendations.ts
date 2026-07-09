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
  departmentsTable,
  hospitalsTable,
  dutyVerificationsTable,
} from "@workspace/db";
import { eq, and, count, sum, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Weights (section is the primary filter / highest bonus) ────────────────────
const WEIGHTS = {
  sameSection: 35,         // Student is in the target section — highest priority
  noConflict: 20,          // No duty schedule conflict on this date
  needsRequiredCase: 15,   // Still missing required clinical cases for this ward
  lowestDutyHours: 15,     // Fewer total completed duty hours (relative to peers)
  nearbyCity: 10,          // Student's city matches hospital city/address
  fairDistribution: 8,     // Fewer total duties assigned (balanced workload)
  needsMakeup: 5,          // Has a pending makeup duty
  // Penalties
  scheduleConflict: -40,   // Existing duty on same date (effectively disqualifies)
  moreThan3Absent: -25,    // Poor attendance — too many absences
  moreThan5Late: -15,      // Too many late records
  alreadyCompletedCase: -20, // Already finished all required cases (deprioritise)
};

interface StudentStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string | null;
  yearLevel: number | null;
  section: string | null;
  landmark: string | null;
  city: string | null;
  transportationMethod: string | null;
  attendanceRate: number;
  totalHoursCompleted: number;
  totalDutyCount: number;
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
  const needsMakeup = attendanceRecords.some((a) => a.needsMakeup && !a.makeupCompleted);
  const totalHoursCompleted = attendanceRecords.reduce((s, a) => s + (a.dutyHours ?? 0), 0);
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100;

  const [dutyCountRow] = await db
    .select({ cnt: count() })
    .from(scheduleStudentsTable)
    .where(eq(scheduleStudentsTable.studentId, studentId));
  const totalDutyCount = Number(dutyCountRow?.cnt ?? 0);

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
    landmark: profile?.landmark ?? null,
    city: profile?.city ?? null,
    transportationMethod: profile?.transportationMethod ?? null,
    attendanceRate,
    totalHoursCompleted: Math.round(totalHoursCompleted * 100) / 100,
    totalDutyCount,
    needsMakeup,
    lateCount,
    absenceCount,
    verifiedCaseCounts,
  };
}

interface ScoreResult {
  score: number;
  reasons: Array<{ criterion: string; weight: number; applied: boolean; description: string }>;
}

async function scoreStudent(
  stats: StudentStats,
  targetCaseIds: string[],
  targetCaseRequirements: Record<string, number>,
  targetSection: string | null,
  scheduleDate: string | undefined,
  departmentId: string | undefined,
  hospitalAddress: string | undefined,
  allStudentHours: number[],
  allStudentDutyCounts: number[],
): Promise<ScoreResult> {
  const reasons: ScoreResult["reasons"] = [];
  let score = 50;

  // ── 1. Section Match (highest priority) ───────────────────────────────────────
  const sectionMatch = !!(targetSection && stats.section &&
    targetSection.toUpperCase() === stats.section.toUpperCase());
  reasons.push({
    criterion: "Same Section",
    weight: WEIGHTS.sameSection,
    applied: sectionMatch,
    description: sectionMatch
      ? `Student is in the assigned section (${stats.section})`
      : `Student is in section ${stats.section ?? "unknown"} — not the target section`,
  });
  if (sectionMatch) score += WEIGHTS.sameSection;

  // ── 2. No Duty Schedule Conflict ──────────────────────────────────────────────
  let hasConflict = false;
  if (scheduleDate) {
    const conflictLinks = await db
      .select({ scheduleId: scheduleStudentsTable.scheduleId })
      .from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.studentId, stats.id));
    const ids = conflictLinks.map((l) => l.scheduleId);
    if (ids.length > 0) {
      const conflictingSchedules = await db
        .select()
        .from(schedulesTable)
        .where(and(inArray(schedulesTable.id, ids), eq(schedulesTable.dutyDate, scheduleDate)));
      hasConflict = conflictingSchedules.some((s) => s.status !== "cancelled");
    }
  }
  reasons.push({
    criterion: "No Schedule Conflict",
    weight: hasConflict ? WEIGHTS.scheduleConflict : WEIGHTS.noConflict,
    applied: true,
    description: hasConflict
      ? "Student already has a duty assigned on this date"
      : "No scheduling conflicts on this date",
  });
  if (hasConflict) score += WEIGHTS.scheduleConflict;
  else score += WEIGHTS.noConflict;

  // ── 3. Academic Schedule Conflict Check ────────────────────────────────────────
  // (skipped if no date — no penalty applied)

  // ── 4. Missing Required Clinical Cases ───────────────────────────────────────
  const needsCase =
    targetCaseIds.length === 0 ||
    targetCaseIds.some((cid) => {
      const required = targetCaseRequirements[cid] ?? 1;
      return (stats.verifiedCaseCounts[cid] ?? 0) < required;
    });
  const alreadyCompleted = targetCaseIds.length > 0 && !needsCase;

  reasons.push({
    criterion: "Missing Required Clinical Cases",
    weight: WEIGHTS.needsRequiredCase,
    applied: needsCase,
    description: needsCase
      ? "Student still needs clinical case exposure in this ward"
      : "Student has completed all required cases for this ward",
  });
  if (needsCase) score += WEIGHTS.needsRequiredCase;

  if (alreadyCompleted) {
    reasons.push({
      criterion: "All Required Cases Completed",
      weight: WEIGHTS.alreadyCompletedCase,
      applied: true,
      description: "Student has already completed all required cases (lower priority for this duty)",
    });
    score += WEIGHTS.alreadyCompletedCase;
  }

  // ── 5. Lowest Duty Hours (relative to peers) ──────────────────────────────────
  let lowestHours = false;
  if (allStudentHours.length > 1) {
    const sortedHours = [...allStudentHours].sort((a, b) => a - b);
    const median = sortedHours[Math.floor(sortedHours.length / 2)];
    lowestHours = stats.totalHoursCompleted <= median;
  } else {
    lowestHours = true; // Only candidate
  }
  reasons.push({
    criterion: "Lowest Completed Duty Hours",
    weight: WEIGHTS.lowestDutyHours,
    applied: lowestHours,
    description: `Student has completed ${Math.round(stats.totalHoursCompleted)}h duty hours — ${lowestHours ? "below or at peer median (needs more hours)" : "above peer median"}`,
  });
  if (lowestHours) score += WEIGHTS.lowestDutyHours;

  // ── 6. Landmark / City Proximity to Hospital ──────────────────────────────────
  let cityMatch = false;
  if (stats.city && hospitalAddress) {
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    cityMatch = normalise(hospitalAddress).includes(normalise(stats.city)) ||
                normalise(stats.city).includes(normalise(hospitalAddress.split(",")[0] ?? ""));
  }
  reasons.push({
    criterion: "Landmark Close to Hospital",
    weight: WEIGHTS.nearbyCity,
    applied: cityMatch,
    description: cityMatch
      ? `Student's registered city (${stats.city}) is near the hospital`
      : stats.city
        ? `Student is from ${stats.city} — not close to hospital area`
        : "Student has no registered city for proximity scoring",
  });
  if (cityMatch) score += WEIGHTS.nearbyCity;

  // ── 7. Fair Workload Distribution ────────────────────────────────────────────
  let fairDistribution = false;
  if (allStudentDutyCounts.length > 1) {
    const avgDutyCount = allStudentDutyCounts.reduce((a, b) => a + b, 0) / allStudentDutyCounts.length;
    fairDistribution = stats.totalDutyCount <= avgDutyCount;
  } else {
    fairDistribution = true;
  }
  reasons.push({
    criterion: "Balanced Workload",
    weight: WEIGHTS.fairDistribution,
    applied: fairDistribution,
    description: fairDistribution
      ? `Student has ${stats.totalDutyCount} total duties — balanced relative to peers`
      : `Student has ${stats.totalDutyCount} total duties — above peer average`,
  });
  if (fairDistribution) score += WEIGHTS.fairDistribution;

  // ── 8. Needs Makeup Duty ──────────────────────────────────────────────────────
  reasons.push({
    criterion: "Pending Makeup Duty",
    weight: WEIGHTS.needsMakeup,
    applied: stats.needsMakeup,
    description: stats.needsMakeup
      ? "Student has a pending makeup duty — prioritised"
      : "No pending makeup duty",
  });
  if (stats.needsMakeup) score += WEIGHTS.needsMakeup;

  // ── 9. Penalties ──────────────────────────────────────────────────────────────
  const tooManyAbsent = stats.absenceCount > 3;
  reasons.push({
    criterion: "Excessive Absences",
    weight: WEIGHTS.moreThan3Absent,
    applied: tooManyAbsent,
    description: `Student has ${stats.absenceCount} absence${stats.absenceCount !== 1 ? "s" : ""}`,
  });
  if (tooManyAbsent) score += WEIGHTS.moreThan3Absent;

  const tooManyLate = stats.lateCount > 5;
  reasons.push({
    criterion: "Excessive Late Records",
    weight: WEIGHTS.moreThan5Late,
    applied: tooManyLate,
    description: `Student has ${stats.lateCount} late record${stats.lateCount !== 1 ? "s" : ""}`,
  });
  if (tooManyLate) score += WEIGHTS.moreThan5Late;

  // ── Ward-specific remaining duty days ─────────────────────────────────────────
  if (departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId));
    if (dept && dept.requiredDutyDays > 0) {
      const [verifiedDuties] = await db
        .select({ cnt: count() })
        .from(dutyVerificationsTable)
        .where(and(
          eq(dutyVerificationsTable.studentId, stats.id),
          eq(dutyVerificationsTable.departmentId, departmentId),
          eq(dutyVerificationsTable.status, "officially_verified"),
        ));
      const completedDays = Number(verifiedDuties?.cnt ?? 0);
      const remaining = Math.max(0, dept.requiredDutyDays - completedDays);
      if (remaining === 0 && !alreadyCompleted) {
        // Already completed ward requirements, minor penalty
        score = Math.max(0, score - 5);
      }
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ── Build student-facing reason list (plain strings) ──────────────────────────

function buildReasonStrings(
  reasons: ScoreResult["reasons"],
): string[] {
  return reasons
    .filter((r) => r.applied && r.weight > 0)
    .map((r) => r.description);
}

// ── GET /api/recommendations ──────────────────────────────────────────────────

router.get("/recommendations", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { scheduleId, caseIds, section, yearLevel } = req.query as {
    scheduleId?: string;
    caseIds?: string;
    section?: string;
    yearLevel?: string;
  };

  const targetCaseIds = caseIds ? caseIds.split(",").filter(Boolean) : [];
  let scheduleDate: string | undefined;
  let departmentId: string | undefined;
  let targetSection = section ?? null;
  let hospitalAddress: string | undefined;

  if (scheduleId) {
    const [sch] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
    if (sch) {
      scheduleDate = sch.dutyDate;
      departmentId = sch.departmentId;
      if (!targetSection && sch.eligibleSections) {
        targetSection = sch.eligibleSections.split(",")[0]?.trim() ?? null;
      }
      // Get hospital address for proximity scoring
      const [hosp] = await db.select({ address: hospitalsTable.address }).from(hospitalsTable).where(eq(hospitalsTable.id, sch.hospitalId));
      hospitalAddress = hosp?.address ?? undefined;
    }
  }

  // Fetch required case counts
  const targetCaseRequirements: Record<string, number> = {};
  if (targetCaseIds.length > 0) {
    const cases = await db.select().from(clinicalCasesTable).where(inArray(clinicalCasesTable.id, targetCaseIds));
    for (const c of cases) {
      targetCaseRequirements[c.id] = c.requiredCount;
    }
  }

  // Get all active students — apply section/year filter if specified
  // Section-first: always filter by section when target section is known
  let allStudents = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  const profiles = allStudents.length > 0
    ? await db.select().from(studentProfilesTable).where(inArray(studentProfilesTable.userId, allStudents.map(s => s.id)))
    : [];
  const profileMap = new Map(profiles.map(p => [p.userId, p]));

  // Section-first: if a target section is set, only include students from that section
  if (targetSection) {
    const norm = targetSection.toUpperCase();
    allStudents = allStudents.filter(s => {
      const p = profileMap.get(s.id);
      return p?.section?.toUpperCase() === norm;
    });
  }
  if (yearLevel) {
    const yl = Number(yearLevel);
    allStudents = allStudents.filter(s => {
      const p = profileMap.get(s.id);
      return p?.yearLevel === yl;
    });
  }

  // Build stats for all candidates
  const allStats = await Promise.all(allStudents.map(u => buildStudentStats(u.id)));

  // Compute peer-relative distributions
  const allStudentHours = allStats.map(s => s.totalHoursCompleted);
  const allStudentDutyCounts = allStats.map(s => s.totalDutyCount);

  const recommendations = await Promise.all(
    allStats.map(async (stats) => {
      const { score, reasons } = await scoreStudent(
        stats,
        targetCaseIds,
        targetCaseRequirements,
        targetSection,
        scheduleDate,
        departmentId,
        hospitalAddress,
        allStudentHours,
        allStudentDutyCounts,
      );
      return {
        studentId: stats.id,
        score,
        reasons,
        reasonStrings: buildReasonStrings(reasons),
        student: stats,
        hasConflict: reasons.find(r => r.criterion === "No Schedule Conflict")?.description.includes("already has") ?? false,
      };
    }),
  );

  recommendations.sort((a, b) => {
    if (a.hasConflict && !b.hasConflict) return 1;
    if (!a.hasConflict && b.hasConflict) return -1;
    return b.score - a.score;
  });

  res.json(recommendations);
});

// ── GET /api/recommendations/explanation ─────────────────────────────────────

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
  let departmentId: string | undefined;
  let targetSection: string | null = null;
  let hospitalAddress: string | undefined;

  if (scheduleId) {
    const [sch] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
    if (sch) {
      scheduleDate = sch.dutyDate;
      departmentId = sch.departmentId;
      if (sch.eligibleSections) targetSection = sch.eligibleSections.split(",")[0]?.trim() ?? null;
      const [hosp] = await db.select({ address: hospitalsTable.address }).from(hospitalsTable).where(eq(hospitalsTable.id, sch.hospitalId));
      hospitalAddress = hosp?.address ?? undefined;
    }
  }

  const stats = await buildStudentStats(studentId);
  const { score, reasons } = await scoreStudent(stats, [], {}, targetSection, scheduleDate, departmentId, hospitalAddress, [stats.totalHoursCompleted], [stats.totalDutyCount]);

  const appliedReasons = reasons.filter((r) => r.applied && r.weight > 0);
  const appliedPenalties = reasons.filter((r) => r.applied && r.weight < 0);

  const name = `${stats.firstName} ${stats.lastName}`;
  const positives = appliedReasons.map((r) => r.description).join("; ");
  const negatives = appliedPenalties.map((r) => r.description).join("; ");

  let explanation = `${name} is ${score >= 60 ? "recommended" : "not recommended"} with a score of ${score}/100. `;
  if (positives) explanation += `Positive factors: ${positives}. `;
  if (negatives) explanation += `Factors reducing score: ${negatives}.`;
  if (!positives && !negatives) explanation += "No significant factors found.";

  res.json({ studentId, score, reasons, explanation, reasonStrings: buildReasonStrings(reasons) });
});

// ── GET /api/recommendations/why-assigned/:scheduleId ────────────────────────
// Students call this to see why they were assigned to a specific duty.

router.get("/recommendations/why-assigned/:scheduleId", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { scheduleId } = req.params;
  const studentId = req.session.userId!;

  // Verify student is assigned to this schedule
  const [link] = await db
    .select()
    .from(scheduleStudentsTable)
    .where(and(eq(scheduleStudentsTable.scheduleId, scheduleId), eq(scheduleStudentsTable.studentId, studentId)));

  if (!link) {
    res.status(403).json({ error: "You are not assigned to this schedule" });
    return;
  }

  // If stored reasons exist, return them directly
  if (link.recommendationScore !== null && Array.isArray(link.recommendationReasons) && link.recommendationReasons.length > 0) {
    res.json({
      score: link.recommendationScore,
      reasons: link.recommendationReasons,
      computed: false,
    });
    return;
  }

  // Otherwise compute on the fly
  const [sch] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
  if (!sch) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const [hosp] = await db.select({ address: hospitalsTable.address }).from(hospitalsTable).where(eq(hospitalsTable.id, sch.hospitalId));
  const targetSection = sch.eligibleSections ? sch.eligibleSections.split(",")[0]?.trim() ?? null : null;
  const stats = await buildStudentStats(studentId);
  const { score, reasons } = await scoreStudent(stats, [], {}, targetSection, sch.dutyDate, sch.departmentId, hosp?.address ?? undefined, [stats.totalHoursCompleted], [stats.totalDutyCount]);

  const studentFacingReasons: string[] = [];
  const positives = reasons.filter(r => r.applied && r.weight > 0);
  for (const r of positives) {
    if (r.criterion === "Same Section") studentFacingReasons.push("Your section was assigned to this duty.");
    else if (r.criterion === "No Schedule Conflict") studentFacingReasons.push("You have no class conflict on this date.");
    else if (r.criterion === "Missing Required Clinical Cases") studentFacingReasons.push("You currently need more clinical case exposure.");
    else if (r.criterion === "Lowest Completed Duty Hours") studentFacingReasons.push("You still need more duty hours.");
    else if (r.criterion === "Landmark Close to Hospital") studentFacingReasons.push(`Your registered landmark is near this hospital.`);
    else if (r.criterion === "Balanced Workload") studentFacingReasons.push("Your duty workload is balanced with your classmates.");
    else if (r.criterion === "Pending Makeup Duty") studentFacingReasons.push("You have a pending makeup duty.");
  }

  if (studentFacingReasons.length === 0) {
    studentFacingReasons.push("You were selected for this duty by your scheduler.");
  }

  res.json({ score, reasons: studentFacingReasons, computed: true });
});

export default router;
