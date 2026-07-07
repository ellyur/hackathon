import { Router, type IRouter } from "express";
import {
  db,
  schedulesTable,
  scheduleStudentsTable,
  usersTable,
  hospitalsTable,
  departmentsTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

async function enrichSchedule(schedule: typeof schedulesTable.$inferSelect) {
  const students = await db
    .select({ studentId: scheduleStudentsTable.studentId })
    .from(scheduleStudentsTable)
    .where(eq(scheduleStudentsTable.scheduleId, schedule.id));
  return { ...schedule, studentIds: students.map((s) => s.studentId) };
}

router.get("/schedules", requireAuth, async (req, res): Promise<void> => {
  const { hospitalId, status, studentId, ciId } = req.query as {
    hospitalId?: string;
    status?: string;
    studentId?: string;
    ciId?: string;
  };

  const session = req.session;

  // Students only see their own schedules
  if (session.role === "student") {
    const links = await db
      .select()
      .from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.studentId, session.userId!));
    const scheduleIds = links.map((l) => l.scheduleId);
    if (scheduleIds.length === 0) {
      res.json([]);
      return;
    }
    const schedules = await db
      .select()
      .from(schedulesTable)
      .where(inArray(schedulesTable.id, scheduleIds))
      .orderBy(desc(schedulesTable.dutyDate));
    const enriched = await Promise.all(schedules.map(enrichSchedule));
    res.json(enriched);
    return;
  }

  // CI only sees their own assigned duties
  if (session.role === "ci") {
    const schedules = await db
      .select()
      .from(schedulesTable)
      .where(eq(schedulesTable.ciId, session.userId!))
      .orderBy(desc(schedulesTable.dutyDate));
    const enriched = await Promise.all(schedules.map(enrichSchedule));
    res.json(enriched);
    return;
  }

  // Scheduler / Admin - full access with optional filters
  const conditions = [];
  if (hospitalId) conditions.push(eq(schedulesTable.hospitalId, hospitalId));
  if (status)
    conditions.push(
      eq(
        schedulesTable.status,
        status as "upcoming" | "active" | "completed" | "cancelled",
      ),
    );
  if (ciId) conditions.push(eq(schedulesTable.ciId, ciId));

  let schedules;
  if (studentId) {
    const links = await db
      .select()
      .from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.studentId, studentId));
    const ids = links.map((l) => l.scheduleId);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    const baseConditions = conditions.length ? and(...conditions) : undefined;
    schedules = baseConditions
      ? await db
          .select()
          .from(schedulesTable)
          .where(and(inArray(schedulesTable.id, ids), baseConditions))
          .orderBy(desc(schedulesTable.dutyDate))
      : await db
          .select()
          .from(schedulesTable)
          .where(inArray(schedulesTable.id, ids))
          .orderBy(desc(schedulesTable.dutyDate));
  } else {
    schedules = conditions.length
      ? await db
          .select()
          .from(schedulesTable)
          .where(and(...conditions))
          .orderBy(desc(schedulesTable.dutyDate))
      : await db
          .select()
          .from(schedulesTable)
          .orderBy(desc(schedulesTable.dutyDate));
  }

  const enriched = await Promise.all(schedules.map(enrichSchedule));
  res.json(enriched);
});

router.post("/schedules", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    title?: string;
    hospitalId: string;
    departmentId: string;
    ciId: string;
    dutyDate: string;
    startTime: string;
    endTime: string;
    gracePeriodMin?: number;
    notes?: string;
    studentIds?: string[];
  };

  if (!body.hospitalId || !body.departmentId || !body.ciId || !body.dutyDate || !body.startTime || !body.endTime) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const id = randomUUID();
  await db.insert(schedulesTable).values({
    id,
    title: body.title ?? null,
    hospitalId: body.hospitalId,
    departmentId: body.departmentId,
    ciId: body.ciId,
    dutyDate: body.dutyDate,
    startTime: body.startTime,
    endTime: body.endTime,
    gracePeriodMin: body.gracePeriodMin ?? 15,
    status: "upcoming",
    notes: body.notes ?? null,
    createdBy: req.session.userId!,
  });

  if (body.studentIds?.length) {
    await db.insert(scheduleStudentsTable).values(
      body.studentIds.map((sid) => ({ scheduleId: id, studentId: sid })),
    );
  }

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  res.status(201).json(await enrichSchedule(schedule));
});

router.get("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  // Students may only view schedules they are assigned to
  if (session.role === "student") {
    const [link] = await db
      .select()
      .from(scheduleStudentsTable)
      .where(
        and(eq(scheduleStudentsTable.scheduleId, id), eq(scheduleStudentsTable.studentId, session.userId!)),
      );
    if (!link) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  // CIs may only view schedules assigned to them
  if (session.role === "ci" && schedule.ciId !== session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(await enrichSchedule(schedule));
});

router.patch("/schedules/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const body = req.body as Partial<{
    title: string;
    hospitalId: string;
    departmentId: string;
    ciId: string;
    dutyDate: string;
    startTime: string;
    endTime: string;
    gracePeriodMin: number;
    status: "upcoming" | "active" | "completed" | "cancelled";
    notes: string;
    studentIds: string[];
  }>;

  const updates: Partial<typeof schedulesTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.title !== undefined) updates.title = body.title;
  if (body.hospitalId !== undefined) updates.hospitalId = body.hospitalId;
  if (body.departmentId !== undefined) updates.departmentId = body.departmentId;
  if (body.ciId !== undefined) updates.ciId = body.ciId;
  if (body.dutyDate !== undefined) updates.dutyDate = body.dutyDate;
  if (body.startTime !== undefined) updates.startTime = body.startTime;
  if (body.endTime !== undefined) updates.endTime = body.endTime;
  if (body.gracePeriodMin !== undefined) updates.gracePeriodMin = body.gracePeriodMin;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;

  await db.update(schedulesTable).set(updates).where(eq(schedulesTable.id, id));

  if (body.studentIds !== undefined) {
    await db.delete(scheduleStudentsTable).where(eq(scheduleStudentsTable.scheduleId, id));
    if (body.studentIds.length > 0) {
      await db.insert(scheduleStudentsTable).values(
        body.studentIds.map((sid) => ({ scheduleId: id, studentId: sid })),
      );
    }
  }

  const [updated] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  res.json(await enrichSchedule(updated));
});

router.delete("/schedules/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  await db
    .update(schedulesTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(schedulesTable.id, id));
  res.json({ message: "Schedule cancelled" });
});

export default router;
