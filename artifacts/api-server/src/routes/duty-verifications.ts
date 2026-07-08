import { Router, type IRouter } from "express";
import {
  db,
  dutyVerificationsTable,
  dutyVerificationCasesTable,
  schedulesTable,
  attendanceTable,
  usersTable,
  hospitalsTable,
  departmentsTable,
  caseCompletionsTable,
  clinicalCasesTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and, or, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

/**
 * Enrich a duty verification record with related entity names.
 */
async function enrichVerification(dv: typeof dutyVerificationsTable.$inferSelect) {
  const [student, ci, schedule, hospital, department, attendance] = await Promise.all([
    db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, dv.studentId)).then(r => r[0] ?? null),
    db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, dv.ciId)).then(r => r[0] ?? null),
    db.select().from(schedulesTable).where(eq(schedulesTable.id, dv.scheduleId)).then(r => r[0] ?? null),
    db.select({ id: hospitalsTable.id, name: hospitalsTable.name })
      .from(hospitalsTable).where(eq(hospitalsTable.id, dv.hospitalId)).then(r => r[0] ?? null),
    db.select({ id: departmentsTable.id, name: departmentsTable.name })
      .from(departmentsTable).where(eq(departmentsTable.id, dv.departmentId)).then(r => r[0] ?? null),
    db.select().from(attendanceTable).where(eq(attendanceTable.id, dv.attendanceId)).then(r => r[0] ?? null),
  ]);

  // Fetch selected clinical cases
  const dvCases = await db
    .select()
    .from(dutyVerificationCasesTable)
    .where(eq(dutyVerificationCasesTable.dutyVerificationId, dv.id));

  const caseDetails = dvCases.length > 0
    ? await db
        .select()
        .from(clinicalCasesTable)
        .where(inArray(clinicalCasesTable.id, dvCases.map(c => c.clinicalCaseId)))
    : [];

  return {
    ...dv,
    student,
    ci,
    schedule,
    hospital,
    department,
    attendance,
    selectedCases: dvCases.map(dvc => ({
      ...dvc,
      clinicalCase: caseDetails.find(c => c.id === dvc.clinicalCaseId) ?? null,
    })),
  };
}

/**
 * GET /api/duty-verifications
 * - Students see their own
 * - CIs see requests assigned to them
 * - Schedulers/admins see all
 */
router.get("/duty-verifications", requireAuth, async (req, res): Promise<void> => {
  const session = req.session;
  const { status } = req.query as { status?: string };

  let rows: (typeof dutyVerificationsTable.$inferSelect)[];

  if (session.role === "student") {
    const conditions = [eq(dutyVerificationsTable.studentId, session.userId!)];
    if (status) conditions.push(eq(dutyVerificationsTable.status, status as any));
    rows = await db.select().from(dutyVerificationsTable).where(and(...conditions));
  } else if (session.role === "ci") {
    const conditions = [eq(dutyVerificationsTable.ciId, session.userId!)];
    if (status) conditions.push(eq(dutyVerificationsTable.status, status as any));
    rows = await db.select().from(dutyVerificationsTable).where(and(...conditions));
  } else {
    // scheduler / admin
    if (status) {
      rows = await db
        .select()
        .from(dutyVerificationsTable)
        .where(eq(dutyVerificationsTable.status, status as any));
    } else {
      rows = await db.select().from(dutyVerificationsTable);
    }
  }

  const enriched = await Promise.all(rows.map(enrichVerification));
  res.json(enriched);
});

/**
 * GET /api/duty-verifications/:id
 */
router.get("/duty-verifications/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  const [dv] = await db
    .select()
    .from(dutyVerificationsTable)
    .where(eq(dutyVerificationsTable.id, id));

  if (!dv) {
    res.status(404).json({ error: "Duty verification not found" });
    return;
  }

  // Access control
  if (session.role === "student" && dv.studentId !== session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (session.role === "ci" && dv.ciId !== session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(await enrichVerification(dv));
});

/**
 * POST /api/duty-verifications
 * Student requests duty verification for a completed attendance record.
 * Body: { scheduleId: string, attendanceId: string }
 */
router.post(
  "/duty-verifications",
  requireRole("student"),
  async (req, res): Promise<void> => {
    const studentId = req.session.userId!;
    const { scheduleId, attendanceId } = req.body as {
      scheduleId?: string;
      attendanceId?: string;
    };

    if (!scheduleId || !attendanceId) {
      res.status(400).json({ error: "scheduleId and attendanceId are required" });
      return;
    }

    // Validate attendance belongs to student
    const [attendance] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.id, attendanceId),
          eq(attendanceTable.studentId, studentId),
          eq(attendanceTable.scheduleId, scheduleId),
        ),
      );

    if (!attendance) {
      res.status(404).json({ error: "Attendance record not found or does not belong to you" });
      return;
    }

    // Guard: only allow verification for attended duties
    if (attendance.status !== "present" && attendance.status !== "late") {
      res.status(400).json({
        error: "Duty verification can only be requested for attended duties (present or late)",
      });
      return;
    }

    // Block re-requests for the same attendance — one and only one verification per attendance record
    const [existing] = await db
      .select({ id: dutyVerificationsTable.id, status: dutyVerificationsTable.status })
      .from(dutyVerificationsTable)
      .where(
        and(
          eq(dutyVerificationsTable.attendanceId, attendanceId),
          eq(dutyVerificationsTable.studentId, studentId),
        ),
      );

    if (existing) {
      res.status(409).json({
        error: "A verification request already exists for this duty",
        existingId: existing.id,
        status: existing.status,
      });
      return;
    }

    // Fetch schedule for hospital/dept/ci/date info
    const [schedule] = await db
      .select()
      .from(schedulesTable)
      .where(eq(schedulesTable.id, scheduleId));

    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    const id = randomUUID();
    await db.insert(dutyVerificationsTable).values({
      id,
      studentId,
      scheduleId,
      attendanceId,
      hospitalId: schedule.hospitalId,
      departmentId: schedule.departmentId,
      ciId: schedule.ciId,
      dutyDate: schedule.dutyDate,
      status: "waiting_ci",
    });

    // Notify CI
    try {
      const [student] = await db
        .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(eq(usersTable.id, studentId));

      await db.insert(notificationsTable).values({
        id: randomUUID(),
        userId: schedule.ciId,
        type: "duty_verification_request",
        title: "New Duty Verification Request",
        message: `${student?.firstName ?? "A student"} ${student?.lastName ?? ""} has requested duty verification for ${schedule.dutyDate}.`,
        relatedEntity: "duty_verification",
        relatedId: id,
      });
    } catch {
      // Notification failure is non-fatal
    }

    const [created] = await db
      .select()
      .from(dutyVerificationsTable)
      .where(eq(dutyVerificationsTable.id, id));

    res.status(201).json(await enrichVerification(created));
  },
);

/**
 * PATCH /api/duty-verifications/:id/ci-verify
 * CI selects completed cases and verifies the duty.
 * Body: { caseIds: string[], remarks?: string }
 */
router.patch(
  "/duty-verifications/:id/ci-verify",
  requireRole("ci"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const ciId = req.session.userId!;
    const { caseIds = [], remarks } = req.body as {
      caseIds?: string[];
      remarks?: string;
    };

    const [dv] = await db
      .select()
      .from(dutyVerificationsTable)
      .where(eq(dutyVerificationsTable.id, id));

    if (!dv) {
      res.status(404).json({ error: "Duty verification not found" });
      return;
    }

    if (dv.ciId !== ciId) {
      res.status(403).json({ error: "You are not the assigned CI for this duty" });
      return;
    }

    if (dv.status !== "waiting_ci") {
      res.status(400).json({ error: `Cannot CI-verify from status: ${dv.status}` });
      return;
    }

    // Update status
    await db
      .update(dutyVerificationsTable)
      .set({
        status: "pending_scheduler",
        ciVerifiedAt: new Date(),
        ciVerifiedBy: ciId,
        ciRemarks: remarks ?? null,
        updatedAt: new Date(),
      })
      .where(eq(dutyVerificationsTable.id, id));

    // Replace selected cases
    await db
      .delete(dutyVerificationCasesTable)
      .where(eq(dutyVerificationCasesTable.dutyVerificationId, id));

    if (caseIds.length > 0) {
      await db.insert(dutyVerificationCasesTable).values(
        caseIds.map(caseId => ({
          id: randomUUID(),
          dutyVerificationId: id,
          clinicalCaseId: caseId,
        })),
      );
    }

    // Notify scheduler(s): notify the student for now so they see status change
    try {
      await db.insert(notificationsTable).values({
        id: randomUUID(),
        userId: dv.studentId,
        type: "duty_verification_ci_verified",
        title: "Duty Verified by Clinical Instructor",
        message: `Your duty on ${dv.dutyDate} has been verified by your CI and is now pending scheduler confirmation.`,
        relatedEntity: "duty_verification",
        relatedId: id,
      });
    } catch {
      // non-fatal
    }

    await db.insert(auditLogsTable).values({
      id: randomUUID(),
      userId: ciId,
      action: "duty_ci_verified",
      entityType: "duty_verification",
      entityId: id,
      oldValue: { status: "waiting_ci" },
      newValue: { status: "pending_scheduler", caseIds },
      ipAddress: req.ip ?? "",
    });

    const [updated] = await db
      .select()
      .from(dutyVerificationsTable)
      .where(eq(dutyVerificationsTable.id, id));

    res.json(await enrichVerification(updated));
  },
);

/**
 * PATCH /api/duty-verifications/:id/confirm
 * Scheduler confirms the duty verification.
 * This triggers automatic passport updates (duty days + case completions).
 */
router.patch(
  "/duty-verifications/:id/confirm",
  requireRole("scheduler", "admin"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const schedulerId = req.session.userId!;

    const [dv] = await db
      .select()
      .from(dutyVerificationsTable)
      .where(eq(dutyVerificationsTable.id, id));

    if (!dv) {
      res.status(404).json({ error: "Duty verification not found" });
      return;
    }

    if (dv.status !== "pending_scheduler") {
      res.status(400).json({ error: `Cannot confirm from status: ${dv.status}` });
      return;
    }

    // Mark as officially verified
    await db
      .update(dutyVerificationsTable)
      .set({
        status: "officially_verified",
        schedulerConfirmedAt: new Date(),
        schedulerConfirmedBy: schedulerId,
        updatedAt: new Date(),
      })
      .where(eq(dutyVerificationsTable.id, id));

    // Create verified case_completions for each selected case
    const dvCases = await db
      .select()
      .from(dutyVerificationCasesTable)
      .where(eq(dutyVerificationCasesTable.dutyVerificationId, id));

    for (const dvc of dvCases) {
      await db.insert(caseCompletionsTable).values({
        id: randomUUID(),
        studentId: dv.studentId,
        clinicalCaseId: dvc.clinicalCaseId,
        scheduleId: dv.scheduleId,
        hospitalId: dv.hospitalId,
        departmentId: dv.departmentId,
        status: "verified",
        verifiedAt: new Date(),
        verifiedBy: schedulerId,
        notes: `Auto-verified via duty verification ${id}`,
      });
    }

    // Notify student
    try {
      await db.insert(notificationsTable).values({
        id: randomUUID(),
        userId: dv.studentId,
        type: "duty_verification_confirmed",
        title: "Duty Officially Verified ✓",
        message: `Your duty on ${dv.dutyDate} has been officially verified. Your Clinical Passport has been updated.`,
        relatedEntity: "duty_verification",
        relatedId: id,
      });
    } catch {
      // non-fatal
    }

    await db.insert(auditLogsTable).values({
      id: randomUUID(),
      userId: schedulerId,
      action: "duty_officially_verified",
      entityType: "duty_verification",
      entityId: id,
      oldValue: { status: "pending_scheduler" },
      newValue: { status: "officially_verified" },
      ipAddress: req.ip ?? "",
    });

    const [updated] = await db
      .select()
      .from(dutyVerificationsTable)
      .where(eq(dutyVerificationsTable.id, id));

    res.json(await enrichVerification(updated));
  },
);

export default router;
