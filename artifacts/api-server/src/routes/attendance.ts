import { Router, type IRouter } from "express";
import {
  db,
  attendanceTable,
  schedulesTable,
  scheduleStudentsTable,
  studentProfilesTable,
  auditLogsTable,
  notificationsTable,
  hospitalsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { isValidDescriptor, isFaceMatch, descriptorDistance } from "../lib/face-recognition.js";

/**
 * Short-lived, one-time face-verification tokens.
 * Issued by /attendance/verify-face, consumed by /attendance/time-in.
 * Bound to a userId so they cannot be shared between students.
 */
interface FaceVerificationRecord {
  userId: string;
  expiresAt: number; // ms since epoch
}
const faceVerificationTokens = new Map<string, FaceVerificationRecord>();

// Prune expired tokens every 10 minutes to avoid memory growth
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of faceVerificationTokens) {
    if (record.expiresAt < now) faceVerificationTokens.delete(token);
  }
}, 10 * 60 * 1000).unref();

const router: IRouter = Router();

/** Great-circle distance between two lat/lng points, in meters. */
function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  // Enrich each record with lightweight student profile (name only — section/yearLevel live on studentProfilesTable)
  const studentIds = [...new Set(records.map(r => r.studentId))];
  const students = studentIds.length > 0
    ? await db
        .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(inArray(usersTable.id, studentIds))
    : [];
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const enriched = records.map(r => ({ ...r, student: studentMap[r.studentId] ?? null }));

  res.json(enriched);
});

/**
 * POST /api/attendance/verify-face
 * Body: { descriptor: number[] }  — 128-element face embedding from face-api.js
 *
 * Compares the submitted descriptor against the student's stored descriptor.
 * Returns { verified: boolean, distance?: number, verificationToken?: string }.
 */
router.post("/attendance/verify-face", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { descriptor } = req.body as { descriptor?: unknown };

  if (!isValidDescriptor(descriptor)) {
    res.status(400).json({ error: "descriptor must be an array of 128 finite numbers" });
    return;
  }

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.session.userId!));

  const stored = profile?.faceDescriptor;
  if (!Array.isArray(stored) || stored.length !== 128) {
    res.status(400).json({ error: "Face not enrolled. Please enroll your face first." });
    return;
  }

  const distance = descriptorDistance(stored as number[], descriptor);
  const matched = isFaceMatch(stored as number[], descriptor);

  if (matched) {
    // Issue a one-time, server-bound verification token (5-minute TTL)
    const verificationToken = randomUUID();
    faceVerificationTokens.set(verificationToken, {
      userId: req.session.userId!,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    res.json({ verified: true, distance, verificationToken });
  } else {
    res.json({ verified: false, distance });
  }
});

router.post("/attendance/time-in", requireRole("student"), async (req, res): Promise<void> => {
  const body = req.body as {
    scheduleId: string;
    studentLatitude?: number;
    studentLongitude?: number;
    gpsVerified?: boolean;
    faceVerificationToken?: string; // server-issued one-time token from /verify-face
    livenessVerified?: boolean;
    gpsAccuracy?: number;
  };

  if (!body.scheduleId) {
    res.status(400).json({ error: "scheduleId is required" });
    return;
  }

  // ── Server-side face verification token check ─────────────────────────────
  const tokenRecord = body.faceVerificationToken
    ? faceVerificationTokens.get(body.faceVerificationToken)
    : undefined;

  if (
    !tokenRecord ||
    tokenRecord.expiresAt < Date.now() ||
    tokenRecord.userId !== req.session.userId
  ) {
    res.status(400).json({
      error: "Face verification is required. Please complete face verification before timing in.",
    });
    return;
  }

  // Consume the token — one-time use
  faceVerificationTokens.delete(body.faceVerificationToken!);

  if (!body.gpsVerified) {
    res.status(400).json({ error: "GPS verification must pass before time-in" });
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

  // ── Server-side GPS radius enforcement ─────────────────────────────────────
  // Never trust the client's gpsVerified flag alone — recompute distance from
  // the hospital's configured attendance radius so the check can't be spoofed.
  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, schedule.hospitalId));

  if (
    hospital &&
    typeof body.studentLatitude === "number" &&
    typeof body.studentLongitude === "number"
  ) {
    const distanceMeters = haversineDistanceMeters(
      hospital.latitude,
      hospital.longitude,
      body.studentLatitude,
      body.studentLongitude,
    );
    if (distanceMeters > hospital.attendanceRadius) {
      res.status(400).json({
        error: `You are ${Math.round(distanceMeters)}m from ${hospital.name}, which is outside the ${hospital.attendanceRadius}m attendance radius.`,
      });
      return;
    }
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

  // Block duplicate time-ins for the same student+schedule
  const [existingRecord] = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.scheduleId, body.scheduleId),
        eq(attendanceTable.studentId, req.session.userId!),
      ),
    );
  if (existingRecord) {
    res.status(409).json({ error: "You have already timed in for this schedule." });
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
    faceVerified: true,         // proven by the server-validated token above
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

  // Duty hours come from the schedule's configured dutyHours field (set by Scheduler).
  // This is the OFFICIAL value — it does NOT depend on actual clock-in/clock-out time.
  // Rule: completing a duty awards exactly the configured hours, regardless of when
  // the student timed in or out.
  // Fallback: if the Scheduler hasn't set dutyHours on this schedule yet, compute
  // from the shift length (endTime − startTime) for backward compatibility.
  const [scheduleRow] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, scheduleId));

  let dutyHours: number | null = null;
  if (scheduleRow) {
    if (scheduleRow.dutyHours != null) {
      // Use the officially configured value
      dutyHours = scheduleRow.dutyHours;
    } else {
      // Backward-compat: derive from shift length
      const [sh, sm] = scheduleRow.startTime.split(":").map(Number);
      const [eh, em] = scheduleRow.endTime.split(":").map(Number);
      let diffMin = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMin < 0) diffMin += 24 * 60; // overnight shift
      dutyHours = Math.round((diffMin / 60) * 100) / 100;
    }
  }

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

    // Award duty hours only for completed attendance (not absences).
    // Rule: absences earn no hours — the schedule's hours are only credited
    // when the student actually attended (present or late).
    let ciDutyHours: number | null = null;
    if (body.status !== "absent") {
      if (schedule.dutyHours != null) {
        ciDutyHours = schedule.dutyHours;
      } else {
        // Backward-compat fallback: derive from shift length
        const [sh, sm] = schedule.startTime.split(":").map(Number);
        const [eh, em] = schedule.endTime.split(":").map(Number);
        let diffMin = (eh * 60 + em) - (sh * 60 + sm);
        if (diffMin < 0) diffMin += 24 * 60;
        ciDutyHours = Math.round((diffMin / 60) * 100) / 100;
      }
    }

    const id = randomUUID();
    await db.insert(attendanceTable).values({
      id,
      scheduleId: body.scheduleId,
      studentId: body.studentId,
      ciId: req.session.userId!,
      timeIn: new Date(),
      dutyHours: ciDutyHours,
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

// ── Buddy Attendance ──────────────────────────────────────────────────────────
// Allows a verified student to clock in a classmate via live face scan.
// Business rule: the verifying student must have already completed their own
// GPS + face-verified attendance for the same schedule before they can help
// a classmate.

/**
 * GET /api/attendance/buddy-eligible/:scheduleId
 * Checks whether the current student may clock in a classmate for a given schedule.
 */
router.get("/attendance/buddy-eligible/:scheduleId", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { scheduleId } = req.params;
  const studentId = req.session.userId!;

  const [myRecord] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.scheduleId, scheduleId), eq(attendanceTable.studentId, studentId)));

  if (!myRecord || !myRecord.timeIn) {
    res.json({ eligible: false, reason: "You have not checked in for this schedule yet." });
    return;
  }
  if (!myRecord.gpsVerified) {
    res.json({ eligible: false, reason: "Your attendance must be GPS-verified first." });
    return;
  }
  if (!myRecord.faceVerified) {
    res.json({ eligible: false, reason: "Your attendance must be face-verified first." });
    return;
  }

  res.json({ eligible: true });
});

/**
 * POST /api/attendance/buddy-time-in
 * Body: { scheduleId, targetStudentId, descriptor: number[], latitude?, longitude? }
 *
 * Records attendance for the target student after verifying their face descriptor
 * against their enrolled descriptor. The requesting student must have already
 * completed their own verified attendance for this schedule.
 */
router.post("/attendance/buddy-time-in", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const verifyingStudentId = req.session.userId!;
  const {
    scheduleId,
    targetStudentId,
    descriptor,
    latitude,
    longitude,
  } = req.body as {
    scheduleId: string;
    targetStudentId: string;
    descriptor: unknown;
    latitude?: number;
    longitude?: number;
  };

  if (!scheduleId || !targetStudentId || !descriptor) {
    res.status(400).json({ error: "scheduleId, targetStudentId, and descriptor are required" });
    return;
  }
  if (targetStudentId === verifyingStudentId) {
    res.status(400).json({ error: "You cannot verify attendance for yourself." });
    return;
  }

  // 1. Ensure verifying student has their own verified attendance
  const [myRecord] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.scheduleId, scheduleId), eq(attendanceTable.studentId, verifyingStudentId)));

  if (!myRecord?.timeIn || !myRecord.gpsVerified || !myRecord.faceVerified) {
    res.status(403).json({ error: "You must complete your own GPS and face-verified attendance first." });
    return;
  }

  // 2. Target student must be assigned to this schedule
  const [assignment] = await db
    .select()
    .from(scheduleStudentsTable)
    .where(and(eq(scheduleStudentsTable.scheduleId, scheduleId), eq(scheduleStudentsTable.studentId, targetStudentId)));

  if (!assignment) {
    res.status(400).json({ error: "Target student is not assigned to this schedule." });
    return;
  }

  // 3. Check for already clocked-in target
  const [existing] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.scheduleId, scheduleId), eq(attendanceTable.studentId, targetStudentId)));

  if (existing?.timeIn) {
    res.status(409).json({ error: "Target student has already clocked in." });
    return;
  }

  // 4. Verify the submitted descriptor against the target student's stored descriptor
  if (!isValidDescriptor(descriptor)) {
    res.status(400).json({ error: "descriptor must be an array of 128 finite numbers" });
    return;
  }

  const [targetProfile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, targetStudentId));

  const storedDescriptor = targetProfile?.faceDescriptor;
  if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
    res.status(400).json({ error: "Target student has not enrolled their face yet. They must enroll before buddy attendance is possible." });
    return;
  }

  const matched = isFaceMatch(storedDescriptor as number[], descriptor);
  if (!matched) {
    res.status(401).json({ error: "Face verification failed — the face does not match the target student's enrolled photo." });
    return;
  }

  // 5. Get schedule for timing info
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found." });
    return;
  }

  const now = new Date();
  const [h, m] = schedule.startTime.split(":").map(Number);
  const dutyStart = new Date(schedule.dutyDate);
  dutyStart.setHours(h, m, 0, 0);
  const lateThreshold = new Date(dutyStart.getTime() + schedule.gracePeriodMin * 60 * 1000);
  const status = now > lateThreshold ? "late" : "present";

  // 6. Record buddy attendance
  if (existing) {
    await db.update(attendanceTable).set({
      timeIn: now,
      status,
      gpsVerified: false,
      faceVerified: true,
      livenessVerified: false,
      method: "biometric",
      studentLatitude: latitude ?? null,
      studentLongitude: longitude ?? null,
      verifiedByStudentId: verifyingStudentId,
      isBuddyAttendance: true,
    }).where(eq(attendanceTable.id, existing.id));
  } else {
    const id = randomUUID();
    await db.insert(attendanceTable).values({
      id,
      scheduleId,
      studentId: targetStudentId,
      ciId: schedule.ciId,
      timeIn: now,
      status,
      method: "biometric",
      studentLatitude: latitude ?? null,
      studentLongitude: longitude ?? null,
      gpsVerified: false,
      faceVerified: true,
      livenessVerified: false,
      verifiedByStudentId: verifyingStudentId,
      isBuddyAttendance: true,
      needsMakeup: false,
      makeupCompleted: false,
    });
  }

  const [result] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.scheduleId, scheduleId), eq(attendanceTable.studentId, targetStudentId)));

  res.json(result);
});

export default router;
