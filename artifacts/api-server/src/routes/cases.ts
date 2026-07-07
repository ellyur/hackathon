import { Router, type IRouter } from "express";
import {
  db,
  clinicalCasesTable,
  caseCompletionsTable,
  usersTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Clinical Cases (admin-managed library) ───────────────────────────────────

router.get("/cases", requireAuth, async (_req, res): Promise<void> => {
  const cases = await db
    .select()
    .from(clinicalCasesTable)
    .where(eq(clinicalCasesTable.isActive, true));
  res.json(cases);
});

router.post("/cases", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    name: string;
    description?: string;
    category: string;
    requiredCount?: number;
  };
  if (!body.name || !body.category) {
    res.status(400).json({ error: "Name and category are required" });
    return;
  }

  const id = randomUUID();
  await db.insert(clinicalCasesTable).values({
    id,
    name: body.name,
    description: body.description ?? "",
    category: body.category,
    requiredCount: body.requiredCount ?? 1,
    isActive: true,
  });

  const [c] = await db.select().from(clinicalCasesTable).where(eq(clinicalCasesTable.id, id));
  res.status(201).json(c);
});

router.patch("/cases/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [c] = await db.select().from(clinicalCasesTable).where(eq(clinicalCasesTable.id, id));
  if (!c) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const body = req.body as Partial<{
    name: string;
    description: string;
    category: string;
    requiredCount: number;
    isActive: boolean;
  }>;

  await db
    .update(clinicalCasesTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.requiredCount !== undefined && { requiredCount: body.requiredCount }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    })
    .where(eq(clinicalCasesTable.id, id));

  const [updated] = await db
    .select()
    .from(clinicalCasesTable)
    .where(eq(clinicalCasesTable.id, id));
  res.json(updated);
});

// ── Case Completions ─────────────────────────────────────────────────────────

router.get("/case-completions", requireAuth, async (req, res): Promise<void> => {
  const { studentId, status } = req.query as { studentId?: string; status?: string };
  const session = req.session;

  // Students can only see their own completions
  const effectiveStudentId =
    session.role === "student" ? session.userId : (studentId ?? undefined);

  const conditions = [];
  if (effectiveStudentId) conditions.push(eq(caseCompletionsTable.studentId, effectiveStudentId));
  if (status)
    conditions.push(
      eq(caseCompletionsTable.status, status as "pending" | "verified" | "rejected"),
    );

  const completions = conditions.length
    ? await db
        .select()
        .from(caseCompletionsTable)
        .where(and(...conditions))
        .orderBy(desc(caseCompletionsTable.submittedAt))
    : await db
        .select()
        .from(caseCompletionsTable)
        .orderBy(desc(caseCompletionsTable.submittedAt));

  res.json(completions);
});

router.post("/case-completions", requireRole("student"), async (req, res): Promise<void> => {
  const body = req.body as {
    clinicalCaseId: string;
    scheduleId: string;
    hospitalId: string;
    departmentId: string;
    notes?: string;
    photoUrl?: string;
  };

  if (!body.clinicalCaseId || !body.scheduleId || !body.hospitalId || !body.departmentId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const id = randomUUID();
  await db.insert(caseCompletionsTable).values({
    id,
    studentId: req.session.userId!,
    clinicalCaseId: body.clinicalCaseId,
    scheduleId: body.scheduleId,
    hospitalId: body.hospitalId,
    departmentId: body.departmentId,
    notes: body.notes ?? null,
    photoUrl: body.photoUrl ?? null,
    status: "pending",
  });

  const [cc] = await db
    .select()
    .from(caseCompletionsTable)
    .where(eq(caseCompletionsTable.id, id));
  res.status(201).json(cc);
});

router.patch(
  "/case-completions/:id/verify",
  requireRole("scheduler", "admin"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const [cc] = await db
      .select()
      .from(caseCompletionsTable)
      .where(eq(caseCompletionsTable.id, id));
    if (!cc) {
      res.status(404).json({ error: "Case completion not found" });
      return;
    }

    await db
      .update(caseCompletionsTable)
      .set({
        status: "verified",
        verifiedAt: new Date(),
        verifiedBy: req.session.userId!,
      })
      .where(eq(caseCompletionsTable.id, id));

    await db.insert(auditLogsTable).values({
      id: randomUUID(),
      userId: req.session.userId!,
      action: "case_verified",
      entityType: "case_completion",
      entityId: id,
      oldValue: { status: cc.status },
      newValue: { status: "verified" },
      ipAddress: req.ip ?? "",
    });

    const [updated] = await db
      .select()
      .from(caseCompletionsTable)
      .where(eq(caseCompletionsTable.id, id));
    res.json(updated);
  },
);

router.patch(
  "/case-completions/:id/reject",
  requireRole("scheduler", "admin"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const [cc] = await db
      .select()
      .from(caseCompletionsTable)
      .where(eq(caseCompletionsTable.id, id));
    if (!cc) {
      res.status(404).json({ error: "Case completion not found" });
      return;
    }

    const { reason } = req.body as { reason?: string };

    await db
      .update(caseCompletionsTable)
      .set({
        status: "rejected",
        rejectionReason: reason ?? "No reason given",
        verifiedAt: new Date(),
        verifiedBy: req.session.userId!,
      })
      .where(eq(caseCompletionsTable.id, id));

    await db.insert(auditLogsTable).values({
      id: randomUUID(),
      userId: req.session.userId!,
      action: "case_rejected",
      entityType: "case_completion",
      entityId: id,
      oldValue: { status: cc.status },
      newValue: { status: "rejected", rejectionReason: reason },
      ipAddress: req.ip ?? "",
    });

    const [updated] = await db
      .select()
      .from(caseCompletionsTable)
      .where(eq(caseCompletionsTable.id, id));
    res.json(updated);
  },
);

export default router;
