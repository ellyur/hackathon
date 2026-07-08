import { Router, type IRouter } from "express";
import { db, evaluationsTable, schedulesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/evaluations", requireAuth, async (req, res): Promise<void> => {
  const { studentId, scheduleId } = req.query as { studentId?: string; scheduleId?: string };
  const session = req.session;

  const conditions = [];
  if (session.role === "student") {
    conditions.push(eq(evaluationsTable.studentId, session.userId!));
  } else if (session.role === "ci") {
    conditions.push(eq(evaluationsTable.ciId, session.userId!));
    if (studentId) conditions.push(eq(evaluationsTable.studentId, studentId));
  } else {
    if (studentId) conditions.push(eq(evaluationsTable.studentId, studentId));
  }
  if (scheduleId) conditions.push(eq(evaluationsTable.scheduleId, scheduleId));

  const items = conditions.length
    ? await db.select().from(evaluationsTable).where(and(...conditions)).orderBy(desc(evaluationsTable.createdAt))
    : await db.select().from(evaluationsTable).orderBy(desc(evaluationsTable.createdAt));

  res.json(items);
});

router.post("/evaluations", requireRole("ci"), async (req, res): Promise<void> => {
  const body = req.body as {
    scheduleId: string;
    studentId: string;
    rating: number;
    remarks?: string;
  };

  if (!body.scheduleId || !body.studentId || body.rating === undefined) {
    res.status(400).json({ error: "scheduleId, studentId, and rating are required" });
    return;
  }
  if (body.rating < 1 || body.rating > 5) {
    res.status(400).json({ error: "rating must be between 1 and 5" });
    return;
  }

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, body.scheduleId));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  if (schedule.ciId !== req.session.userId) {
    res.status(403).json({ error: "You can only evaluate students on your own duty schedules" });
    return;
  }

  // One evaluation per student per schedule — upsert semantics
  const [existing] = await db
    .select()
    .from(evaluationsTable)
    .where(and(eq(evaluationsTable.scheduleId, body.scheduleId), eq(evaluationsTable.studentId, body.studentId)));

  if (existing) {
    await db
      .update(evaluationsTable)
      .set({
        rating: body.rating,
        remarks: body.remarks ?? null,
      })
      .where(eq(evaluationsTable.id, existing.id));
    const [updated] = await db.select().from(evaluationsTable).where(eq(evaluationsTable.id, existing.id));
    res.json(updated);
    return;
  }

  const id = randomUUID();
  await db.insert(evaluationsTable).values({
    id,
    scheduleId: body.scheduleId,
    studentId: body.studentId,
    ciId: req.session.userId!,
    rating: body.rating,
    remarks: body.remarks ?? null,
  });

  const [evaluation] = await db.select().from(evaluationsTable).where(eq(evaluationsTable.id, id));
  res.status(201).json(evaluation);
});

export default router;
