import { Router, type IRouter } from "express";
import {
  db,
  attendanceTable,
  schedulesTable,
  scheduleStudentsTable,
  auditLogsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const { scheduleId, studentId } = req.query as {
    scheduleId?: string;
    studentId?: string;
  };
  const session = req.session;

  const conditions = [];

  if (session.role === "student") {
    // Students see only their own records
    conditions.push(eq(attendanceTable.studentId, session.userId!));
  } else if (session.role === "ci") {
    // CIs see only attendance for schedules they are assigned to
    conditions.push(eq(attendanceTable.ciId, session.userId!));
    if (studentId) conditions.push(eq(attendanceTable.studentId, studentId));
  } else {
    // Admin / Scheduler — full access with optional filters
    if (studentId) conditions.push(eq(attendanceTable.studentId, studentId));
  }

  if (scheduleId) conditions.push(eq(attendanceTable.scheduleId, scheduleId));

  const records = conditions.length
    ? await db
        .select()
        .from(attendanceTable)
        .where(and(...conditions))
        .orderBy(desc(attendanceTable.createdAt))
    : await db
        .select()
        .from(attendanceTable)
        .orderBy(desc(attendanceTable.createdAt));

  res.json(records);
});

router.post("/attendance/time-in", requireRole("student"), async (req, res): Promise<void> => {
  const body = req.body as {
    scheduleId: string;
    studentLatitude?: number;
    studentLongitude?: number;
    gpsVerified?: boolean;
    faceVerified?: boolean;
    livenessVerified?: boolean;
    gpsAccuracy?: number;
  };

  if (!body.scheduleId) {
    res.status(400).json({ error: "scheduleId is required" });
    return;
  }

  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, body.scheduleId));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  // Verify the student is actually assigned to this schedule
  const [assignment] = await db
    .select()
    .from(scheduleStudentsTable)
    .where(
      and(
        eq(scheduleStudentsTable.scheduleId, body.scheduleId),
        eq(scheduleStudentsTable.studentId, req.session.userId!),
      ),
    );
  if (!assignment) {
    res.status(403).json({ error: "You are not assigned to this schedule" });
    return;
  }

  // Biometric verification must be confirmed by the client
  if (!body.gpsVerified || !body.faceVerified || !body.livenessVerified) {
    res.status(400).json({ error: "GPS, face, and liveness verification must all pass before time-in" });
    return;
  }

  // Determine late status
  const now = new Date();
  const [h, m] = schedule.startTime.split(":").map(Number);
  const dutyStart = new Date(schedule.dutyDate);
  dutyStart.setHours(h, m, 0, 0);
  const lateThreshold = new Date(dutyStart.getTime() + schedule.gracePeriodMin * 60 * 1000);
  const status = now > lateThreshold ? "late" : "present";

  const id = randomUUID();
  await db.insert(attendanceTable).values({
    id,
    scheduleId: body.scheduleId,
    studentId: req.session.userId!,
    timeIn: now,
    status,
    method: "biometric",
    studentLatitude: body.studentLatitude ?? null,
    studentLongitude: body.studentLongitude ?? null,
    gpsVerified: body.gpsVerified ?? false,
    faceVerified: body.faceVerified ?? false,
    livenessVerified: body.livenessVerified ?? false,
  });

  const [record] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, id));
  res.status(201).json(record);
});

router.post("/attendance/time-out", requireRole("student"), async (req, res): Promise<void> => {
  const { scheduleId } = req.body as { scheduleId: string };
  if (!scheduleId) {
    res.status(400).json({ error: "scheduleId is required" });
    return;
  }

  const [record] = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.scheduleId, scheduleId),
        eq(attendanceTable.studentId, req.session.userId!),
      ),
    );

  if (!record) {
    res.status(404).json({ error: "No time-in record found" });
    return;
  }

  const now = new Date();
  const dutyHours = record.timeIn
    ? Math.round(((now.getTime() - record.timeIn.getTime()) / 3600000) * 100) / 100
    : null;

  await db
    .update(attendanceTable)
    .set({ timeOut: now, dutyHours })
    .where(eq(attendanceTable.id, record.id));

  const [updated] = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.id, record.id));
  res.json(updated);
});

router.post(
  "/attendance/ci-assisted",
  requireRole("ci"),
  async (req, res): Promise<void> => {
    const body = req.body as {
      scheduleId: string;
      studentId: string;
      status: "present" | "late" | "absent";
      remarks?: string;
      gpsVerified?: boolean;
      faceVerified?: boolean;
    };

    if (!body.scheduleId || !body.studentId || !body.status) {
      res.status(400).json({ error: "scheduleId, studentId, and status are required" });
      return;
    }

    // Verify this CI is assigned to the schedule
    const [schedule] = await db
      .select()
      .from(schedulesTable)
      .where(and(eq(schedulesTable.id, body.scheduleId), eq(schedulesTable.ciId, req.session.userId!)));
    if (!schedule) {
      res.status(403).json({ error: "You are not the CI for this schedule" });
      return;
    }

    // Verify the student is assigned to this schedule
    const [studentAssignment] = await db
      .select()
      .from(scheduleStudentsTable)
      .where(
        and(
          eq(scheduleStudentsTable.scheduleId, body.scheduleId),
          eq(scheduleStudentsTable.studentId, body.studentId),
        ),
      );
    if (!studentAssignment) {
      res.status(400).json({ error: "Student is not assigned to this schedule" });
      return;
    }

    const id = randomUUID();
    await db.insert(attendanceTable).values({
      id,
      scheduleId: body.scheduleId,
      studentId: body.studentId,
      ciId: req.session.userId!,
      timeIn: new Date(),
      status: body.status,
      method: "ci_assisted",
      gpsVerified: body.gpsVerified ?? true,
      faceVerified: body.faceVerified ?? true,
      livenessVerified: true,
      remarks: body.remarks ?? null,
    });

    const [record] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, id));
    res.status(201).json(record);
  },
);

router.patch(
  "/attendance/:id/manual",
  requireRole("ci", "scheduler", "admin"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const [record] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, id));
    if (!record) {
      res.status(404).json({ error: "Attendance record not found" });
      return;
    }

    const body = req.body as {
      status: "present" | "late" | "absent";
      remarks?: string;
    };

    if (!body.status) {
      res.status(400).json({ error: "Status is required" });
      return;
    }

    const needsMakeup = body.status === "absent";
    await db
      .update(attendanceTable)
      .set({
        status: body.status,
        remarks: body.remarks ?? record.remarks,
        method: "manual",
        needsMakeup,
        ciId: req.session.userId!,
      })
      .where(eq(attendanceTable.id, id));

    // If marked absent, create notification for scheduler
    if (needsMakeup) {
      await db.insert(notificationsTable).values({
        id: randomUUID(),
        userId: req.session.userId!, // TODO: route to actual scheduler
        type: "absence_marked",
        title: "Student Marked Absent",
        message: `A student has been marked ABSENT for schedule ${record.scheduleId}.`,
        relatedEntity: "attendance",
        relatedId: id,
        isRead: false,
      });
    }

    await db.insert(auditLogsTable).values({
      id: randomUUID(),
      userId: req.session.userId!,
      action: "attendance_manual_override",
      entityType: "attendance",
      entityId: id,
      oldValue: { status: record.status },
      newValue: { status: body.status },
      ipAddress: req.ip ?? "",
    });

    const [updated] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, id));
    res.json(updated);
  },
);

export default router;
