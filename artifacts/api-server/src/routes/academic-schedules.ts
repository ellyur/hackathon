import { Router, type IRouter } from "express";
import { db, studentAcademicSchedulesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

const VALID_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Students manage their own academic (non-clinical) class schedule.
// Admin/scheduler can view any student's academic schedule (e.g. for conflict checks).
router.get("/academic-schedules", requireAuth, async (req, res): Promise<void> => {
  const { studentId } = req.query as { studentId?: string };
  const session = req.session;

  const effectiveStudentId = session.role === "student" ? session.userId! : studentId;
  if (!effectiveStudentId) {
    res.status(400).json({ error: "studentId is required" });
    return;
  }

  const items = await db
    .select()
    .from(studentAcademicSchedulesTable)
    .where(eq(studentAcademicSchedulesTable.studentId, effectiveStudentId));
  res.json(items);
});

router.post("/academic-schedules", requireRole("student"), async (req, res): Promise<void> => {
  const body = req.body as {
    subject: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    semester?: string;
    schoolYear?: string;
  };

  if (!body.subject || !body.dayOfWeek || !body.startTime || !body.endTime) {
    res.status(400).json({ error: "subject, dayOfWeek, startTime, and endTime are required" });
    return;
  }
  if (!VALID_DAYS.includes(body.dayOfWeek.toLowerCase())) {
    res.status(400).json({ error: `dayOfWeek must be one of ${VALID_DAYS.join(", ")}` });
    return;
  }

  const id = randomUUID();
  await db.insert(studentAcademicSchedulesTable).values({
    id,
    studentId: req.session.userId!,
    subject: body.subject,
    dayOfWeek: body.dayOfWeek.toLowerCase(),
    startTime: body.startTime,
    endTime: body.endTime,
    semester: body.semester ?? "",
    schoolYear: body.schoolYear ?? "",
  });

  const [item] = await db
    .select()
    .from(studentAcademicSchedulesTable)
    .where(eq(studentAcademicSchedulesTable.id, id));
  res.status(201).json(item);
});

router.patch("/academic-schedules/:id", requireRole("student"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [item] = await db
    .select()
    .from(studentAcademicSchedulesTable)
    .where(
      and(
        eq(studentAcademicSchedulesTable.id, id),
        eq(studentAcademicSchedulesTable.studentId, req.session.userId!),
      ),
    );
  if (!item) {
    res.status(404).json({ error: "Schedule entry not found" });
    return;
  }

  const body = req.body as Partial<{
    subject: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    semester: string;
    schoolYear: string;
  }>;

  await db
    .update(studentAcademicSchedulesTable)
    .set({
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek.toLowerCase() }),
      ...(body.startTime !== undefined && { startTime: body.startTime }),
      ...(body.endTime !== undefined && { endTime: body.endTime }),
      ...(body.semester !== undefined && { semester: body.semester }),
      ...(body.schoolYear !== undefined && { schoolYear: body.schoolYear }),
    })
    .where(eq(studentAcademicSchedulesTable.id, id));

  const [updated] = await db
    .select()
    .from(studentAcademicSchedulesTable)
    .where(eq(studentAcademicSchedulesTable.id, id));
  res.json(updated);
});

router.delete("/academic-schedules/:id", requireRole("student"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [item] = await db
    .select()
    .from(studentAcademicSchedulesTable)
    .where(
      and(
        eq(studentAcademicSchedulesTable.id, id),
        eq(studentAcademicSchedulesTable.studentId, req.session.userId!),
      ),
    );
  if (!item) {
    res.status(404).json({ error: "Schedule entry not found" });
    return;
  }
  await db.delete(studentAcademicSchedulesTable).where(eq(studentAcademicSchedulesTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
