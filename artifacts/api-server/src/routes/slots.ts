import { Router, type IRouter } from "express";
import { db, dutySlotsTable, dutyApplicationsTable, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/slots", requireAuth, async (req, res): Promise<void> => {
  const { status, isMakeup } = req.query as { status?: string; isMakeup?: string };
  const conditions = [];
  if (status) conditions.push(eq(dutySlotsTable.status, status as "open" | "closed" | "cancelled"));
  if (isMakeup !== undefined) conditions.push(eq(dutySlotsTable.isMakeup, isMakeup === "true"));

  const slots = conditions.length
    ? await db.select().from(dutySlotsTable).where(and(...conditions)).orderBy(desc(dutySlotsTable.dutyDate))
    : await db.select().from(dutySlotsTable).orderBy(desc(dutySlotsTable.dutyDate));

  res.json(slots);
});

router.post("/slots", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    hospitalId: string;
    departmentId: string;
    ciId?: string;
    dutyDate: string;
    startTime: string;
    endTime: string;
    maxStudents?: number;
    isMakeup?: boolean;
    description?: string;
  };

  if (!body.hospitalId || !body.departmentId || !body.dutyDate || !body.startTime || !body.endTime) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const id = randomUUID();
  await db.insert(dutySlotsTable).values({
    id,
    hospitalId: body.hospitalId,
    departmentId: body.departmentId,
    ciId: body.ciId ?? null,
    dutyDate: body.dutyDate,
    startTime: body.startTime,
    endTime: body.endTime,
    maxStudents: body.maxStudents ?? 2,
    isMakeup: body.isMakeup ?? false,
    description: body.description ?? null,
    status: "open",
    createdBy: req.session.userId!,
  });

  const [slot] = await db.select().from(dutySlotsTable).where(eq(dutySlotsTable.id, id));
  res.status(201).json(slot);
});

router.patch("/slots/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [slot] = await db.select().from(dutySlotsTable).where(eq(dutySlotsTable.id, id));
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  const body = req.body as Partial<{
    maxStudents: number;
    description: string;
    status: "open" | "closed" | "cancelled";
    isMakeup: boolean;
  }>;

  await db.update(dutySlotsTable).set({
    ...(body.maxStudents !== undefined && { maxStudents: body.maxStudents }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.isMakeup !== undefined && { isMakeup: body.isMakeup }),
  }).where(eq(dutySlotsTable.id, id));

  const [updated] = await db.select().from(dutySlotsTable).where(eq(dutySlotsTable.id, id));
  res.json(updated);
});

router.delete("/slots/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  await db.update(dutySlotsTable).set({ status: "cancelled" }).where(eq(dutySlotsTable.id, id));
  res.json({ message: "Slot cancelled" });
});

router.post("/slots/:id/apply", requireRole("student"), async (req, res): Promise<void> => {
  const { id: slotId } = req.params;
  const studentId = req.session.userId!;

  const [slot] = await db.select().from(dutySlotsTable).where(eq(dutySlotsTable.id, slotId));
  if (!slot || slot.status !== "open") {
    res.status(400).json({ error: "Slot is not open for applications" });
    return;
  }

  // Check for existing application
  const [existing] = await db
    .select()
    .from(dutyApplicationsTable)
    .where(and(eq(dutyApplicationsTable.slotId, slotId), eq(dutyApplicationsTable.studentId, studentId)));
  if (existing) {
    res.status(400).json({ error: "Already applied to this slot" });
    return;
  }

  const id = randomUUID();
  await db.insert(dutyApplicationsTable).values({
    id,
    slotId,
    studentId,
    status: "pending",
  });

  const [app] = await db.select().from(dutyApplicationsTable).where(eq(dutyApplicationsTable.id, id));
  res.status(201).json(app);
});

router.get("/slots/:id/applications", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id: slotId } = req.params;
  const apps = await db
    .select()
    .from(dutyApplicationsTable)
    .where(eq(dutyApplicationsTable.slotId, slotId))
    .orderBy(dutyApplicationsTable.appliedAt);
  res.json(apps);
});

router.patch(
  "/slots/:id/applications/:appId",
  requireRole("scheduler", "admin"),
  async (req, res): Promise<void> => {
    const { id: slotId, appId } = req.params;
    const { status, notes } = req.body as { status: "approved" | "rejected"; notes?: string };

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Status must be approved or rejected" });
      return;
    }

    await db
      .update(dutyApplicationsTable)
      .set({
        status,
        reviewedBy: req.session.userId!,
        reviewedAt: new Date(),
        notes: notes ?? null,
      })
      .where(eq(dutyApplicationsTable.id, appId));

    const [updated] = await db
      .select()
      .from(dutyApplicationsTable)
      .where(eq(dutyApplicationsTable.id, appId));

    // Notify student
    await db.insert(notificationsTable).values({
      id: randomUUID(),
      userId: updated.studentId,
      type: status === "approved" ? "slot_approved" : "slot_rejected",
      title: status === "approved" ? "Slot Application Approved" : "Slot Application Not Approved",
      message:
        status === "approved"
          ? "Your application for a duty slot has been approved."
          : `Your duty slot application was not approved${notes ? `: ${notes}` : "."}`,
      relatedEntity: "slot",
      relatedId: slotId,
      isRead: false,
    });

    res.json(updated);
  },
);

export default router;
