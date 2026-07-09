import { Router, type IRouter } from "express";
import {
  db,
  schedulesTable,
  scheduleStudentsTable,
  usersTable,
  studentProfilesTable,
  attendanceTable,
  hospitalsTable,
  departmentsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc, inArray, count, lt, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  emailDutyAssigned,
  emailDutyCancelled,
  emailScheduleUpdated,
  emailCIDutyNote,
} from "../lib/email.js";

// ── Auto-advance schedule statuses ─────────────────────────────────────────────
// Runs on startup and every minute so statuses reflect real wall-clock time.

async function autoAdvanceScheduleStatuses() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const timeStr  = now.toTimeString().slice(0, 5);  // "HH:MM"

  try {
    // 1. upcoming → active  (today, start ≤ now < end)
    await db
      .update(schedulesTable)
      .set({ status: "active", updatedAt: now })
      .where(
        and(
          eq(schedulesTable.status, "upcoming"),
          eq(schedulesTable.dutyDate, todayStr),
          // startTime ≤ current time
          or(
            lt(schedulesTable.startTime, timeStr),
            eq(schedulesTable.startTime, timeStr),
          ),
          // endTime > current time — keep active until end
          // (we can't do GT easily on text without raw sql; just promote to active
          //  and let the next branch complete it when endTime passes)
        ),
      );

    // 2. upcoming | active → completed  (past days OR today past endTime)
    await db
      .update(schedulesTable)
      .set({ status: "completed", updatedAt: now })
      .where(
        and(
          or(
            eq(schedulesTable.status, "upcoming"),
            eq(schedulesTable.status, "active"),
          ),
          or(
            // Any past day
            lt(schedulesTable.dutyDate, todayStr),
            // Today but end time has passed
            and(
              eq(schedulesTable.dutyDate, todayStr),
              lt(schedulesTable.endTime, timeStr),
            ),
          ),
        ),
      );
  } catch {
    // Non-fatal — next tick will retry
  }
}

// Run once immediately on startup, then every minute
autoAdvanceScheduleStatuses();
setInterval(autoAdvanceScheduleStatuses, 60 * 1000).unref();

const router: IRouter = Router();

// ── Bulk enrich (fast — fixed number of queries regardless of schedule count) ──

async function bulkEnrichSchedules(schedules: (typeof schedulesTable.$inferSelect)[]) {
  if (schedules.length === 0) return [];

  const scheduleIds = schedules.map((s) => s.id);
  const hospitalIds  = [...new Set(schedules.map((s) => s.hospitalId))];
  const deptIds      = [...new Set(schedules.map((s) => s.departmentId))];
  const ciIds        = [...new Set(schedules.map((s) => s.ciId).filter(Boolean))] as string[];

  const [studentLinks, hospitals, departments, ciUsers] = await Promise.all([
    db.select({
        scheduleId: scheduleStudentsTable.scheduleId,
        studentId:  scheduleStudentsTable.studentId,
        recommendationScore:   scheduleStudentsTable.recommendationScore,
        recommendationReasons: scheduleStudentsTable.recommendationReasons,
      })
      .from(scheduleStudentsTable)
      .where(inArray(scheduleStudentsTable.scheduleId, scheduleIds)),

    db.select({ id: hospitalsTable.id, name: hospitalsTable.name, address: hospitalsTable.address, latitude: hospitalsTable.latitude, longitude: hospitalsTable.longitude, attendanceRadius: hospitalsTable.attendanceRadius })
      .from(hospitalsTable)
      .where(inArray(hospitalsTable.id, hospitalIds)),

    db.select({ id: departmentsTable.id, name: departmentsTable.name })
      .from(departmentsTable)
      .where(inArray(departmentsTable.id, deptIds)),

    ciIds.length > 0
      ? db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, phone: usersTable.phone })
          .from(usersTable)
          .where(inArray(usersTable.id, ciIds))
      : Promise.resolve([]),
  ]);

  // Build lookup maps
  const hospitalMap  = new Map(hospitals.map((h) => [h.id, h]));
  const deptMap      = new Map(departments.map((d) => [d.id, d]));
  const ciMap        = new Map(ciUsers.map((c) => [c.id, c]));

  // Group student links by scheduleId
  const linksBySchedule = new Map<string, typeof studentLinks>();
  for (const link of studentLinks) {
    if (!linksBySchedule.has(link.scheduleId)) linksBySchedule.set(link.scheduleId, []);
    linksBySchedule.get(link.scheduleId)!.push(link);
  }

  // Fetch all student details in one shot
  const allStudentIds = [...new Set(studentLinks.map((l) => l.studentId))];
  const studentDetails = allStudentIds.length > 0
    ? await db.select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        avatarUrl: usersTable.avatarUrl,
        section: studentProfilesTable.section,
        yearLevel: studentProfilesTable.yearLevel,
        studentNumber: studentProfilesTable.studentNumber,
      })
      .from(usersTable)
      .leftJoin(studentProfilesTable, eq(studentProfilesTable.userId, usersTable.id))
      .where(inArray(usersTable.id, allStudentIds))
    : [];

  const studentMap = new Map(studentDetails.map((s) => [s.id, s]));

  return schedules.map((schedule) => {
    const links = linksBySchedule.get(schedule.id) ?? [];
    const studentIds = links.map((l) => l.studentId);
    const students = studentIds.map((id) => studentMap.get(id)).filter(Boolean);
    return {
      ...schedule,
      studentIds,
      students,
      hospital:   hospitalMap.get(schedule.hospitalId) ?? null,
      department: deptMap.get(schedule.departmentId) ?? null,
      ci:         schedule.ciId ? (ciMap.get(schedule.ciId) ?? null) : null,
    };
  });
}

// ── Single-schedule enrich (used for create/update responses) ─────────────────

async function enrichSchedule(schedule: typeof schedulesTable.$inferSelect) {
  const [result] = await bulkEnrichSchedules([schedule]);
  return result;
}

// ── GET /schedules ─────────────────────────────────────────────────────────────

router.get("/schedules", requireAuth, async (req, res): Promise<void> => {
  const { hospitalId, status, studentId, ciId } = req.query as Record<string, string | undefined>;
  const session = req.session;

  if (session.role === "student") {
    const links = await db.select().from(scheduleStudentsTable).where(eq(scheduleStudentsTable.studentId, session.userId!));
    const ids = links.map((l) => l.scheduleId);
    if (ids.length === 0) { res.json([]); return; }
    const schedules = await db.select().from(schedulesTable).where(inArray(schedulesTable.id, ids)).orderBy(desc(schedulesTable.dutyDate));
    res.json(await bulkEnrichSchedules(schedules));
    return;
  }

  if (session.role === "ci") {
    const schedules = await db.select().from(schedulesTable).where(eq(schedulesTable.ciId, session.userId!)).orderBy(desc(schedulesTable.dutyDate));
    res.json(await bulkEnrichSchedules(schedules));
    return;
  }

  const conditions = [];
  if (hospitalId) conditions.push(eq(schedulesTable.hospitalId, hospitalId));
  if (status) conditions.push(eq(schedulesTable.status, status as "upcoming" | "active" | "completed" | "cancelled"));
  if (ciId) conditions.push(eq(schedulesTable.ciId, ciId));

  let schedules;
  if (studentId) {
    const links = await db.select().from(scheduleStudentsTable).where(eq(scheduleStudentsTable.studentId, studentId));
    const ids = links.map((l) => l.scheduleId);
    if (ids.length === 0) { res.json([]); return; }
    schedules = conditions.length
      ? await db.select().from(schedulesTable).where(and(inArray(schedulesTable.id, ids), and(...conditions))).orderBy(desc(schedulesTable.dutyDate))
      : await db.select().from(schedulesTable).where(inArray(schedulesTable.id, ids)).orderBy(desc(schedulesTable.dutyDate));
  } else {
    schedules = conditions.length
      ? await db.select().from(schedulesTable).where(and(...conditions)).orderBy(desc(schedulesTable.dutyDate))
      : await db.select().from(schedulesTable).orderBy(desc(schedulesTable.dutyDate));
  }

  res.json(await bulkEnrichSchedules(schedules));
});

// ── GET /schedules/recommendations ────────────────────────────────────────────

router.get("/schedules/recommendations", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { dutyDate, yearLevel, sections, excludeIds } = req.query as Record<string, string | undefined>;

  // All active students with profiles
  let students = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      yearLevel: studentProfilesTable.yearLevel,
      section: studentProfilesTable.section,
      studentNumber: studentProfilesTable.studentNumber,
    })
    .from(usersTable)
    .innerJoin(studentProfilesTable, eq(studentProfilesTable.userId, usersTable.id))
    .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

  // Filters
  if (yearLevel) students = students.filter((s) => s.yearLevel === Number(yearLevel));
  const sectionList = sections ? sections.split(",").map((s) => s.trim().toUpperCase()) : [];
  if (sectionList.length > 0) students = students.filter((s) => sectionList.includes((s.section ?? "").toUpperCase()));
  const excludedIds = excludeIds ? excludeIds.split(",") : [];
  if (excludedIds.length > 0) students = students.filter((s) => !excludedIds.includes(s.id));

  // Score each student
  const scored = await Promise.all(
    students.map(async (student) => {
      // Duty count
      const [{ value: dutyCount }] = await db
        .select({ value: count() })
        .from(scheduleStudentsTable)
        .where(eq(scheduleStudentsTable.studentId, student.id));

      // Conflict check on target date
      let hasConflict = false;
      if (dutyDate) {
        const conflicts = await db
          .select({ id: schedulesTable.id })
          .from(schedulesTable)
          .innerJoin(scheduleStudentsTable, eq(scheduleStudentsTable.scheduleId, schedulesTable.id))
          .where(and(eq(scheduleStudentsTable.studentId, student.id), eq(schedulesTable.dutyDate, dutyDate)));
        hasConflict = conflicts.length > 0;
      }

      // Attendance rate
      const [{ value: totalAtt }] = await db.select({ value: count() }).from(attendanceTable).where(eq(attendanceTable.studentId, student.id));
      const [{ value: presentAtt }] = await db.select({ value: count() }).from(attendanceTable).where(and(eq(attendanceTable.studentId, student.id), eq(attendanceTable.status, "present")));
      const attendanceRate = Number(totalAtt) > 0 ? Number(presentAtt) / Number(totalAtt) : 0;

      // Score
      const dutyScore = Math.max(0, 40 - Number(dutyCount) * 2);
      const attScore = Math.round(attendanceRate * 40);
      const sectionScore = sectionList.length === 0 || sectionList.includes((student.section ?? "").toUpperCase()) ? 20 : 0;
      const score = hasConflict ? 0 : Math.min(100, dutyScore + attScore + sectionScore);

      const reasons: string[] = [];
      if (!hasConflict) reasons.push("No Class Conflict");
      if (attendanceRate >= 0.9) reasons.push("Excellent Attendance");
      else if (attendanceRate >= 0.7) reasons.push("Good Attendance");
      else if (Number(totalAtt) === 0) reasons.push("New Student");
      if (Number(dutyCount) === 0) reasons.push("No Previous Duties");
      else if (Number(dutyCount) <= 3) reasons.push("Low Duty Hours");
      if (sectionList.length > 0 && sectionList.includes((student.section ?? "").toUpperCase())) reasons.push("Section Priority");

      return {
        ...student,
        dutyCount: Number(dutyCount),
        attendanceRate,
        attendanceRatePercent: Math.round(attendanceRate * 100),
        hasConflict,
        score,
        reasons,
      };
    }),
  );

  scored.sort((a, b) => {
    if (a.hasConflict && !b.hasConflict) return 1;
    if (!a.hasConflict && b.hasConflict) return -1;
    return b.score - a.score;
  });

  res.json(scored);
});

// ── POST /schedules ────────────────────────────────────────────────────────────

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
    /** Official Duty Hours for this shift — set by Scheduler. Awarded to students upon completion. */
    dutyHours?: number;
    notes?: string;
    maxStudents?: number;
    requiredYearLevel?: number;
    eligibleSections?: string;
    caseTypeId?: string;
    studentIds?: string[];
    studentRecommendations?: Array<{ studentId: string; score: number; reasons: string[] }>;
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
    dutyHours: body.dutyHours ?? null,
    status: "upcoming",
    notes: body.notes ?? null,
    maxStudents: body.maxStudents ?? 10,
    requiredYearLevel: body.requiredYearLevel ?? null,
    eligibleSections: body.eligibleSections ?? null,
    caseTypeId: body.caseTypeId ?? null,
    createdBy: req.session.userId!,
  });

  if (body.studentIds?.length) {
    const recMap = new Map((body.studentRecommendations ?? []).map((r: { studentId: string; score: number; reasons: string[] }) => [r.studentId, r]));
    await db.insert(scheduleStudentsTable).values(
      body.studentIds.map((sid) => ({
        scheduleId: id,
        studentId: sid,
        recommendationScore: recMap.get(sid)?.score ?? null,
        recommendationReasons: recMap.get(sid)?.reasons ?? null,
      })),
    );
  }

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  const enriched = await enrichSchedule(schedule);

  // Send duty-assigned emails to all assigned students (non-fatal)
  if (body.studentIds?.length) {
    const ciName = enriched.ci
      ? `${enriched.ci.firstName} ${enriched.ci.lastName}`
      : "Your Clinical Instructor";
    for (const sid of body.studentIds) {
      emailDutyAssigned({
        studentId: sid,
        hospital: enriched.hospital?.name ?? body.hospitalId,
        department: enriched.department?.name ?? body.departmentId,
        dutyDate: body.dutyDate,
        startTime: body.startTime,
        endTime: body.endTime,
        ciName,
        scheduleId: id,
      }).catch(() => {});
    }
  }

  res.status(201).json(enriched);
});

// ── GET /schedules/:id ────────────────────────────────────────────────────────

router.get("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }

  if (session.role === "student") {
    const [link] = await db.select().from(scheduleStudentsTable).where(and(eq(scheduleStudentsTable.scheduleId, id), eq(scheduleStudentsTable.studentId, session.userId!)));
    if (!link) { res.status(403).json({ error: "Forbidden" }); return; }
  }
  if (session.role === "ci" && schedule.ciId !== session.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  res.json(await enrichSchedule(schedule));
});

// ── PATCH /schedules/:id ──────────────────────────────────────────────────────

router.patch("/schedules/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }

  const body = req.body as Partial<{
    title: string; hospitalId: string; departmentId: string; ciId: string;
    dutyDate: string; startTime: string; endTime: string; gracePeriodMin: number;
    /** Official Duty Hours for this shift — set by Scheduler. Awarded to students upon completion. */
    dutyHours: number;
    status: "upcoming" | "active" | "completed" | "cancelled"; notes: string;
    maxStudents: number; requiredYearLevel: number; eligibleSections: string;
    caseTypeId: string; studentIds: string[];
  }>;

  const updates: Partial<typeof schedulesTable.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.hospitalId !== undefined) updates.hospitalId = body.hospitalId;
  if (body.departmentId !== undefined) updates.departmentId = body.departmentId;
  if (body.ciId !== undefined) updates.ciId = body.ciId;
  if (body.dutyDate !== undefined) updates.dutyDate = body.dutyDate;
  if (body.startTime !== undefined) updates.startTime = body.startTime;
  if (body.endTime !== undefined) updates.endTime = body.endTime;
  if (body.gracePeriodMin !== undefined) updates.gracePeriodMin = body.gracePeriodMin;
  if (body.dutyHours !== undefined) updates.dutyHours = body.dutyHours;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.maxStudents !== undefined) updates.maxStudents = body.maxStudents;
  if (body.requiredYearLevel !== undefined) updates.requiredYearLevel = body.requiredYearLevel;
  if (body.eligibleSections !== undefined) updates.eligibleSections = body.eligibleSections;
  if (body.caseTypeId !== undefined) updates.caseTypeId = body.caseTypeId;

  await db.update(schedulesTable).set(updates).where(eq(schedulesTable.id, id));

  if (body.studentIds !== undefined) {
    // Track previously assigned students so we can email only newly added ones
    const previousLinks = await db.select({ studentId: scheduleStudentsTable.studentId })
      .from(scheduleStudentsTable).where(eq(scheduleStudentsTable.scheduleId, id));
    const previousIds = new Set(previousLinks.map(l => l.studentId));

    await db.delete(scheduleStudentsTable).where(eq(scheduleStudentsTable.scheduleId, id));
    if (body.studentIds.length > 0) {
      await db.insert(scheduleStudentsTable).values(body.studentIds.map((sid) => ({ scheduleId: id, studentId: sid })));
    }

    // Email newly added students a duty-assigned notice (non-fatal)
    const newlyAdded = body.studentIds.filter(sid => !previousIds.has(sid));
    if (newlyAdded.length > 0) {
      try {
        const [currentSched] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
        if (currentSched) {
          const [[hospRow], [deptRow], [ciUser]] = await Promise.all([
            db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, currentSched.hospitalId)),
            db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, currentSched.departmentId)),
            db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, currentSched.ciId)),
          ]);
          for (const sid of newlyAdded) {
            emailDutyAssigned({
              studentId: sid,
              hospital: hospRow?.name ?? currentSched.hospitalId,
              department: deptRow?.name ?? currentSched.departmentId,
              dutyDate: currentSched.dutyDate,
              startTime: currentSched.startTime,
              endTime: currentSched.endTime,
              ciName: ciUser ? `${ciUser.firstName} ${ciUser.lastName}` : "Your Clinical Instructor",
              scheduleId: id,
            }).catch(() => {});
          }
        }
      } catch { /* non-fatal */ }
    }
  }

  // Fire notifications to assigned students + CI whenever key schedule fields change
  const keyFieldChanged =
    body.hospitalId !== undefined || body.departmentId !== undefined ||
    body.ciId !== undefined || body.dutyDate !== undefined ||
    body.startTime !== undefined || body.endTime !== undefined ||
    body.status !== undefined;

  if (keyFieldChanged) {
    const [afterUpdate] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
    const affectedStudents = await db.select({ studentId: scheduleStudentsTable.studentId })
      .from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.scheduleId, id));

    const changeDetail = body.status !== undefined
      ? `Status changed to "${body.status}".`
      : `Duty date or time has been updated — please review your schedule.`;

    const notifMessage = `Your duty on ${afterUpdate.dutyDate} at ${afterUpdate.startTime} has been modified. ${changeDetail}`;

    const recipientIds = [
      ...affectedStudents.map(s => s.studentId),
      ...(afterUpdate.ciId ? [afterUpdate.ciId] : []),
    ];

    if (recipientIds.length > 0) {
      await db.insert(notificationsTable).values(
        recipientIds.map(uid => ({
          id: randomUUID(),
          userId: uid,
          type: "schedule_change",
          title: "Schedule Updated",
          message: notifMessage,
          relatedEntity: "schedule",
          relatedId: id,
          isRead: false,
        }))
      );

      // Email each recipient with resolved names (non-fatal)
      try {
        const [[hospRow]] = await Promise.all([
          db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, afterUpdate.hospitalId)),
        ]);
        for (const uid of recipientIds) {
          emailScheduleUpdated({
            recipientId: uid,
            hospital: hospRow?.name ?? afterUpdate.hospitalId,
            dutyDate: afterUpdate.dutyDate,
            changeDetail,
            scheduleId: id,
          }).catch(() => {});
        }
      } catch { /* non-fatal */ }
    }
  }

  const [updated] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  res.json(await enrichSchedule(updated));
});

// ── PATCH /schedules/:id/notes  (CI only — update note on own duty) ───────────

router.patch("/schedules/:id/notes", requireRole("ci"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const { notes } = req.body as { notes?: string };

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }
  if (schedule.ciId !== req.session.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(schedulesTable)
    .set({ notes: notes ?? null, updatedAt: new Date() })
    .where(eq(schedulesTable.id, id));

  // Notify assigned students about the new/updated note
  if (notes?.trim()) {
    const studentLinks = await db.select({ studentId: scheduleStudentsTable.studentId })
      .from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.scheduleId, id));

    if (studentLinks.length > 0) {
      await db.insert(notificationsTable).values(
        studentLinks.map(s => ({
          id: randomUUID(),
          userId: s.studentId,
          type: "schedule_change",
          title: "Duty Note Updated",
          message: `Your CI left a note for your duty on ${schedule.dutyDate}: "${notes.trim()}"`,
          relatedEntity: "schedule",
          relatedId: id,
          isRead: false,
        }))
      );

      // Get hospital/dept/CI names for email, then send — all non-fatal
      try {
        const [[hosp], [dept], [ciUser]] = await Promise.all([
          db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, schedule.hospitalId)),
          db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, schedule.departmentId)),
          db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, req.session.userId!)),
        ]);
        for (const link of studentLinks) {
          emailCIDutyNote({
            studentId: link.studentId,
            ciName: ciUser ? `${ciUser.firstName} ${ciUser.lastName}` : "Your CI",
            hospital: hosp?.name ?? schedule.hospitalId,
            department: dept?.name ?? schedule.departmentId,
            dutyDate: schedule.dutyDate,
            note: notes.trim(),
          }).catch(() => {});
        }
      } catch { /* non-fatal */ }
    }
  }

  const [updated] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  res.json(await enrichSchedule(updated));
});

// ── DELETE /schedules/:id ─────────────────────────────────────────────────────

router.delete("/schedules/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  if (!reason || !reason.trim()) {
    res.status(400).json({ error: "A cancellation reason is required" });
    return;
  }

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, id));
  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }

  await db.update(schedulesTable).set({
    status: "cancelled",
    cancellationReason: reason.trim(),
    cancelledBy: req.session.userId,
    cancelledAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(schedulesTable.id, id));

  // Notify assigned students + CI with the reason
  const affectedStudents = await db.select({ studentId: scheduleStudentsTable.studentId })
    .from(scheduleStudentsTable)
    .where(eq(scheduleStudentsTable.scheduleId, id));

  const recipientIds = [
    ...affectedStudents.map(s => s.studentId),
    ...(schedule.ciId ? [schedule.ciId] : []),
  ];

  if (recipientIds.length > 0) {
    await db.insert(notificationsTable).values(
      recipientIds.map(uid => ({
        id: randomUUID(),
        userId: uid,
        type: "schedule_change",
        title: "Duty Schedule Cancelled",
        message: `Your duty on ${schedule.dutyDate} at ${schedule.startTime} has been cancelled. Reason: ${reason.trim()}`,
        relatedEntity: "schedule",
        relatedId: id,
        isRead: false,
      }))
    );

    // Email each recipient with resolved names (non-fatal)
    try {
      const [[hospRow], [deptRow]] = await Promise.all([
        db.select({ name: hospitalsTable.name }).from(hospitalsTable).where(eq(hospitalsTable.id, schedule.hospitalId)),
        db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, schedule.departmentId)),
      ]);
      for (const uid of recipientIds) {
        emailDutyCancelled({
          recipientId: uid,
          hospital: hospRow?.name ?? schedule.hospitalId,
          department: deptRow?.name ?? schedule.departmentId,
          dutyDate: schedule.dutyDate,
          startTime: schedule.startTime,
          reason: reason.trim(),
        }).catch(() => {});
      }
    } catch { /* non-fatal */ }
  }

  res.json({ message: "Schedule cancelled" });
});

export default router;
