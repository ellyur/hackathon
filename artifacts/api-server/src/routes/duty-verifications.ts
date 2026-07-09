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
import {
  emailVerificationRequested,
  emailCIVerified,
  emailOfficiallyVerified,
  emailVerificationReturned,
} from "../lib/email.js";

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
    const { scheduleId, attendanceId, studentCaseIds } = req.body as {
      scheduleId?: string;
      attendanceId?: string;
      studentCaseIds?: unknown;
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

    // Validate and normalise studentCaseIds
    const validCaseIds: string[] = Array.isArray(studentCaseIds)
      ? (studentCaseIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

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

    // Pre-populate case selections from student's claim
    if (validCaseIds.length > 0) {
      // Verify the claimed case IDs exist before inserting
      const existingCases = await db
        .select({ id: clinicalCasesTable.id })
        .from(clinicalCasesTable)
        .where(and(inArray(clinicalCasesTable.id, validCaseIds), eq(clinicalCasesTable.isActive, true)));

      const confirmedIds = existingCases.map(c => c.id);
      if (confirmedIds.length > 0) {
        await db.insert(dutyVerificationCasesTable).values(
          confirmedIds.map(caseId => ({
            id: randomUUID(),
            dutyVerificationId: id,
            clinicalCaseId: caseId,
          })),
        );
      }
    }

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

      // Email CI
      const [hospitalRow] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, schedule.hospitalId));
      const [deptRow] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, schedule.departmentId));
      emailVerificationRequested({
        ciId: schedule.ciId,
        studentName: `${student?.firstName ?? "A student"} ${student?.lastName ?? ""}`.trim(),
        hospital: hospitalRow?.name ?? schedule.hospitalId,
        department: deptRow?.name ?? schedule.departmentId,
        dutyDate: schedule.dutyDate,
        verificationId: id,
      }).catch(() => {});
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
 * POST /api/duty-verifications/bulk-ci-verify
 * CI verifies multiple duty verification requests in one atomic transaction.
 * Body: { ids: string[], caseIds: string[], remarks?: string }
 * Returns: { verified: number, results: Array<{ id, status, error? }> }
 */
router.post(
  "/duty-verifications/bulk-ci-verify",
  requireRole("ci"),
  async (req, res): Promise<void> => {
    const ciId = req.session.userId!;
    const { ids, caseIds, remarks } = req.body as {
      ids?: unknown;
      caseIds?: unknown;
      remarks?: unknown;
    };

    // ── Strict input validation ───────────────────────────────────────────────
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== "string")) {
      res.status(400).json({ error: "ids must be a non-empty array of strings" });
      return;
    }
    if (!Array.isArray(caseIds) || caseIds.some(id => typeof id !== "string")) {
      res.status(400).json({ error: "caseIds must be an array of strings" });
      return;
    }
    if (remarks !== undefined && typeof remarks !== "string") {
      res.status(400).json({ error: "remarks must be a string" });
      return;
    }

    // Deduplicate to prevent double-processing
    const uniqueIds: string[] = [...new Set(ids as string[])];
    const uniqueCaseIds: string[] = [...new Set(caseIds as string[])];

    const now = new Date();
    const verifiedIds: string[] = [];

    // ── Atomic transaction with in-transaction precondition guards ────────────
    // Each update uses WHERE id + ciId + status='waiting_ci' and checks the
    // returned row count — if any row fails, the whole transaction rolls back.
    try {
      await db.transaction(async (tx) => {
        for (const id of uniqueIds) {
          // Conditional update: only proceeds if preconditions hold at write time
          const updated = await tx
            .update(dutyVerificationsTable)
            .set({
              status: "pending_scheduler",
              ciVerifiedAt: now,
              ciVerifiedBy: ciId,
              ciRemarks: (remarks as string | undefined) ?? null,
              updatedAt: now,
            })
            .where(
              and(
                eq(dutyVerificationsTable.id, id),
                eq(dutyVerificationsTable.ciId, ciId),
                eq(dutyVerificationsTable.status, "waiting_ci"),
              ),
            )
            .returning({ id: dutyVerificationsTable.id, studentId: dutyVerificationsTable.studentId, dutyDate: dutyVerificationsTable.dutyDate });

          if (updated.length === 0) {
            throw Object.assign(
              new Error(`Precondition failed for id ${id}: not found, not assigned to you, or not in waiting_ci status`),
              { preconditionId: id },
            );
          }

          // Replace cases for this verification
          await tx
            .delete(dutyVerificationCasesTable)
            .where(eq(dutyVerificationCasesTable.dutyVerificationId, id));

          if (uniqueCaseIds.length > 0) {
            await tx.insert(dutyVerificationCasesTable).values(
              uniqueCaseIds.map(caseId => ({
                id: randomUUID(),
                dutyVerificationId: id,
                clinicalCaseId: caseId,
              })),
            );
          }

          verifiedIds.push(id);
        }
      });
    } catch (err: any) {
      if (err?.preconditionId) {
        res.status(400).json({ error: err.message, failedId: err.preconditionId });
      } else {
        throw err;
      }
      return;
    }

    // ── Side-effects: notifications + audit logs (non-fatal) ─────────────────
    // Fetch the now-updated records for notification metadata
    const updatedRecords = await db
      .select({ id: dutyVerificationsTable.id, studentId: dutyVerificationsTable.studentId, dutyDate: dutyVerificationsTable.dutyDate })
      .from(dutyVerificationsTable)
      .where(inArray(dutyVerificationsTable.id, verifiedIds));

    await Promise.allSettled(
      updatedRecords.map(async (dv) => {
        try {
          await db.insert(notificationsTable).values({
            id: randomUUID(),
            userId: dv.studentId,
            type: "duty_verification_ci_verified",
            title: "Duty Verified by Clinical Instructor",
            message: `Your duty on ${dv.dutyDate} has been verified by your CI and is now pending scheduler confirmation.`,
            relatedEntity: "duty_verification",
            relatedId: dv.id,
          });

          // Email student for bulk verify (non-fatal)
          const [ciUser] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
            .from(usersTable).where(eq(usersTable.id, ciId));
          const dvRecord = await db.select().from(dutyVerificationsTable).where(eq(dutyVerificationsTable.id, dv.id)).then(r => r[0]);
          if (dvRecord) {
            const [hospRow] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, dvRecord.hospitalId));
            emailCIVerified({
              studentId: dv.studentId,
              ciName: ciUser ? `${ciUser.firstName} ${ciUser.lastName}` : "Your CI",
              hospital: hospRow?.name ?? dvRecord.hospitalId,
              dutyDate: dv.dutyDate,
              verificationId: dv.id,
              remarks: null,
            }).catch(() => {});
          }
        } catch { /* non-fatal */ }

        try {
          await db.insert(auditLogsTable).values({
            id: randomUUID(),
            userId: ciId,
            action: "duty_ci_verified",
            entityType: "duty_verification",
            entityId: dv.id,
            oldValue: { status: "waiting_ci", bulk: true },
            newValue: { status: "pending_scheduler", caseIds: uniqueCaseIds },
            ipAddress: req.ip ?? "",
          });
        } catch { /* non-fatal */ }
      }),
    );

    res.json({
      verified: verifiedIds.length,
      results: verifiedIds.map(id => ({ id, status: "ok" as const })),
    });
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

      // Email student
      const [ciUser] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(eq(usersTable.id, ciId));
      const [hospRow] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, dv.hospitalId));
      emailCIVerified({
        studentId: dv.studentId,
        ciName: ciUser ? `${ciUser.firstName} ${ciUser.lastName}` : "Your CI",
        hospital: hospRow?.name ?? dv.hospitalId,
        dutyDate: dv.dutyDate,
        verificationId: id,
        remarks: remarks ?? null,
      }).catch(() => {});
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

      // Email student
      const [hospRow] = await db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, dv.hospitalId));
      const [deptRow] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, dv.departmentId));
      emailOfficiallyVerified({
        studentId: dv.studentId,
        hospital: hospRow?.name ?? dv.hospitalId,
        department: deptRow?.name ?? dv.departmentId,
        dutyDate: dv.dutyDate,
        verificationId: id,
      }).catch(() => {});
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

/**
 * PATCH /api/duty-verifications/:id/return
 * CI returns the duty verification request back to the student.
 * The record is deleted so the student can re-request with corrected information.
 * Body: { reason?: string }
 */
router.patch(
  "/duty-verifications/:id/return",
  requireRole("ci"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const ciId = req.session.userId!;
    const { reason } = req.body as { reason?: string };

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
      res.status(400).json({ error: "Can only return requests that are waiting for CI review" });
      return;
    }

    // Notify the student that the request has been returned
    try {
      await db.insert(notificationsTable).values({
        id: randomUUID(),
        userId: dv.studentId,
        type: "duty_verification_request",
        title: "Duty Verification Returned",
        message: reason
          ? `Your duty verification request for ${dv.dutyDate} was returned by your CI: ${reason}. Please resubmit after addressing the concern.`
          : `Your duty verification request for ${dv.dutyDate} was returned by your CI. Please resubmit after addressing any concerns.`,
        relatedEntity: "duty_verification",
        relatedId: id,
      });

      // Email student
      const [ciUser] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(eq(usersTable.id, ciId));
      emailVerificationReturned({
        studentId: dv.studentId,
        ciName: ciUser ? `${ciUser.firstName} ${ciUser.lastName}` : "Your CI",
        dutyDate: dv.dutyDate,
        reason: reason ?? null,
      }).catch(() => {});
    } catch {
      // non-fatal
    }

    // Audit log before deletion
    await db.insert(auditLogsTable).values({
      id: randomUUID(),
      userId: ciId,
      action: "duty_verification_returned",
      entityType: "duty_verification",
      entityId: id,
      oldValue: { status: "waiting_ci" },
      newValue: { action: "returned_to_student", reason: reason ?? null },
      ipAddress: req.ip ?? "",
    });

    // Delete the verification so the student can resubmit
    await db.delete(dutyVerificationCasesTable).where(eq(dutyVerificationCasesTable.dutyVerificationId, id));
    await db.delete(dutyVerificationsTable).where(eq(dutyVerificationsTable.id, id));

    res.json({ message: "Duty verification returned to student" });
  },
);

export default router;
