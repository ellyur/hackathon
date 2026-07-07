import { Router, type IRouter } from "express";
import {
  attendance, schedules, notifications, randomUUID,
  buildAttendanceResponse, type AttendanceStatus,
} from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const { scheduleId, studentId, status } = req.query as {
    scheduleId?: string; studentId?: string; status?: string;
  };
  const currentRole = req.session.role!;
  const currentUserId = req.session.userId!;

  let result = attendance;
  if (currentRole === "student") result = result.filter((a) => a.studentId === currentUserId);
  else {
    if (studentId) result = result.filter((a) => a.studentId === studentId);
  }
  if (scheduleId) result = result.filter((a) => a.scheduleId === scheduleId);
  if (status) result = result.filter((a) => a.status === status);

  res.json(result.map(buildAttendanceResponse));
});

router.post("/attendance/time-in", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as {
    scheduleId: string; studentLatitude?: number; studentLongitude?: number;
    gpsVerified: boolean; faceVerified: boolean; livenessVerified: boolean; deviceInfo?: string;
  };
  if (!body.scheduleId) {
    res.status(400).json({ error: "scheduleId is required" });
    return;
  }

  const studentId = req.session.userId!;
  const schedule = schedules.find((s) => s.id === body.scheduleId);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  if (!body.gpsVerified) {
    res.status(400).json({ error: "You are outside the attendance radius for this hospital" });
    return;
  }
  if (!body.faceVerified || !body.livenessVerified) {
    res.status(400).json({ error: "Face verification failed" });
    return;
  }

  // Determine if late
  const timeInNow = new Date();
  const [sh, sm] = schedule.startTime.split(":").map(Number);
  const scheduleStart = new Date();
  scheduleStart.setHours(sh, sm, 0, 0);
  const diffMin = (timeInNow.getTime() - scheduleStart.getTime()) / 60000;
  const isLate = diffMin > schedule.gracePeriodMin;

  // Check if existing record
  let existing = attendance.find((a) => a.scheduleId === body.scheduleId && a.studentId === studentId);
  if (existing) {
    existing.timeIn = timeInNow.toISOString();
    existing.status = isLate ? "late" : "present";
    existing.gpsVerified = body.gpsVerified;
    existing.faceVerified = body.faceVerified;
    existing.livenessVerified = body.livenessVerified;
    existing.method = "biometric";
    res.json(buildAttendanceResponse(existing));
    return;
  }

  const newRecord = {
    id: randomUUID(),
    scheduleId: body.scheduleId,
    studentId,
    ciId: schedule.ciId,
    timeIn: timeInNow.toISOString(),
    timeOut: null,
    dutyHours: null,
    status: (isLate ? "late" : "present") as AttendanceStatus,
    method: "biometric" as const,
    studentLatitude: body.studentLatitude ?? null,
    studentLongitude: body.studentLongitude ?? null,
    gpsVerified: body.gpsVerified,
    faceVerified: body.faceVerified,
    livenessVerified: body.livenessVerified,
    remarks: null,
    needsMakeup: false,
    makeupCompleted: false,
    createdAt: new Date().toISOString(),
  };
  attendance.push(newRecord);

  // Notify student
  notifications.push({
    id: randomUUID(),
    userId: studentId,
    type: "time_in_recorded",
    title: "Time In Recorded",
    message: `Your Time In has been recorded at ${timeInNow.toLocaleTimeString()}. Status: ${newRecord.status.toUpperCase()}.`,
    relatedEntity: "attendance",
    relatedId: newRecord.id,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });

  res.json(buildAttendanceResponse(newRecord));
});

router.post("/attendance/time-out", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as {
    scheduleId: string; studentLatitude?: number; studentLongitude?: number;
    gpsVerified: boolean; faceVerified: boolean; livenessVerified: boolean; deviceInfo?: string;
  };
  if (!body.scheduleId) {
    res.status(400).json({ error: "scheduleId is required" });
    return;
  }
  if (!body.gpsVerified || !body.faceVerified || !body.livenessVerified) {
    res.status(400).json({ error: "Verification failed. Cannot record Time Out." });
    return;
  }

  const studentId = req.session.userId!;
  const record = attendance.find((a) => a.scheduleId === body.scheduleId && a.studentId === studentId);
  if (!record || !record.timeIn) {
    res.status(400).json({ error: "No active Time In record found" });
    return;
  }

  const now = new Date();
  record.timeOut = now.toISOString();
  const timeInDate = new Date(record.timeIn);
  record.dutyHours = Math.round(((now.getTime() - timeInDate.getTime()) / 3600000) * 100) / 100;

  notifications.push({
    id: randomUUID(),
    userId: studentId,
    type: "time_out_recorded",
    title: "Time Out Recorded",
    message: `Your Time Out has been recorded. Duty hours: ${record.dutyHours.toFixed(2)} hours.`,
    relatedEntity: "attendance",
    relatedId: record.id,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });

  res.json(buildAttendanceResponse(record));
});

router.post("/attendance/ci-assisted", requireRole("ci", "scheduler", "admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    scheduleId: string; studentId: string; status: AttendanceStatus;
    gpsVerified?: boolean; faceVerified?: boolean; remarks?: string;
  };
  if (!body.scheduleId || !body.studentId || !body.status) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const existing = attendance.find((a) => a.scheduleId === body.scheduleId && a.studentId === body.studentId);
  if (existing) {
    existing.status = body.status;
    existing.method = "ci_assisted";
    existing.gpsVerified = body.gpsVerified ?? false;
    existing.faceVerified = body.faceVerified ?? false;
    existing.remarks = body.remarks ?? null;
    if (body.status === "absent") {
      existing.needsMakeup = true;
    }
    res.json(buildAttendanceResponse(existing));
    return;
  }

  const newRecord = {
    id: randomUUID(),
    scheduleId: body.scheduleId,
    studentId: body.studentId,
    ciId: req.session.userId!,
    timeIn: body.status !== "absent" ? new Date().toISOString() : null,
    timeOut: null,
    dutyHours: null,
    status: body.status,
    method: "ci_assisted" as const,
    studentLatitude: null,
    studentLongitude: null,
    gpsVerified: body.gpsVerified ?? false,
    faceVerified: body.faceVerified ?? false,
    livenessVerified: false,
    remarks: body.remarks ?? null,
    needsMakeup: body.status === "absent",
    makeupCompleted: false,
    createdAt: new Date().toISOString(),
  };
  attendance.push(newRecord);
  res.json(buildAttendanceResponse(newRecord));
});

router.patch("/attendance/:id/manual", requireRole("ci", "scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const record = attendance.find((a) => a.id === id);
  if (!record) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }
  const { status, remarks } = req.body as { status: AttendanceStatus; remarks?: string };
  if (!status) {
    res.status(400).json({ error: "Status is required" });
    return;
  }
  record.status = status;
  record.method = "manual";
  record.remarks = remarks ?? record.remarks;
  record.needsMakeup = status === "absent";

  if (status === "absent") {
    notifications.push({
      id: randomUUID(),
      userId: record.studentId,
      type: "marked_absent",
      title: "You Were Marked Absent",
      message: "You have been marked ABSENT for your duty. Please contact your Scheduler.",
      relatedEntity: "attendance",
      relatedId: record.id,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  res.json(buildAttendanceResponse(record));
});

export default router;
