import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  studentProfilesTable,
  attendanceTable,
  caseCompletionsTable,
  clinicalCasesTable,
} from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Face enrollment (Luxand.cloud) ───────────────────────────────────────────

import {
  createPerson,
  addPhotoToPerson,
  deletePerson,
} from "../lib/luxand.js";

router.get("/students/me/face-descriptor", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.session.userId!));

  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  res.json({
    enrolled: !!profile.luxandPersonUuid,
    descriptor: null, // descriptor is now managed server-side via Luxand
  });
});

/**
 * POST /api/students/me/face-enroll
 * Body: { image: string }  — base64-encoded JPEG (no data-URL prefix)
 *
 * Enrolls or re-enrolls the student's face using Luxand.cloud.
 * If the student already has a Luxand person UUID, the old entry is deleted
 * and a fresh one is created so the student gets a clean reference photo.
 */
router.post("/students/me/face-enroll", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { image } = req.body as { image?: string };

  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "image (base64 JPEG) is required" });
    return;
  }

  const imageBuffer = Buffer.from(image, "base64");
  if (imageBuffer.length < 1000) {
    res.status(400).json({ error: "Image is too small or malformed" });
    return;
  }

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.session.userId!));

  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  try {
    // Delete old Luxand person on re-enroll so the student starts clean
    if (profile.luxandPersonUuid) {
      await deletePerson(profile.luxandPersonUuid).catch(() => {/* ignore – may already be deleted */});
    }

    // Create a new Luxand person keyed by student number for traceability
    const personName = `${profile.studentNumber ?? req.session.userId}`;
    const personUuid = await createPerson(personName);

    // Add the captured photo as the reference face
    await addPhotoToPerson(personUuid, imageBuffer);

    // Persist the UUID
    await db
      .update(studentProfilesTable)
      .set({ luxandPersonUuid: personUuid })
      .where(eq(studentProfilesTable.userId, req.session.userId!));

    res.json({ enrolled: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `Face enrollment failed: ${msg}` });
  }
});

// ── Student list ──────────────────────────────────────────────────────────────

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as { search?: string };

  const students = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const profiles = await Promise.all(
    students.map(async (s) => {
      const [profile] = await db
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, s.id));
      const { passwordHash: _pw, ...safe } = s;
      return { ...safe, studentProfile: profile ?? null };
    }),
  );

  if (search) {
    const q = search.toLowerCase();
    return void res.json(
      profiles.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.studentProfile?.studentNumber?.toLowerCase().includes(q),
      ),
    );
  }

  res.json(profiles);
});

router.get("/students/:id/passport", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  // Students can only view their own passport
  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cases = await db
    .select()
    .from(clinicalCasesTable)
    .where(eq(clinicalCasesTable.isActive, true));

  const completions = await db
    .select()
    .from(caseCompletionsTable)
    .where(eq(caseCompletionsTable.studentId, id));

  const passport = cases.map((c) => {
    const studentCompletions = completions.filter((cc) => cc.clinicalCaseId === c.id);
    const verified = studentCompletions.filter((cc) => cc.status === "verified").length;
    const pending = studentCompletions.filter((cc) => cc.status === "pending").length;
    return {
      case: c,
      required: c.requiredCount,
      verified,
      pending,
      remaining: Math.max(0, c.requiredCount - verified),
      status: verified >= c.requiredCount ? "complete" : verified > 0 ? "in_progress" : "not_started",
    };
  });

  const totalRequired = cases.reduce((s, c) => s + c.requiredCount, 0);
  const totalVerified = passport.reduce((s, p) => s + p.verified, 0);

  res.json({
    studentId: id,
    completionRate: totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0,
    totalRequired,
    totalVerified,
    passport,
  });
});

router.get("/students/:id/attendance", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.studentId, id));

  res.json(records);
});

router.get("/students/:id/hours", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;

  if (session.role === "student" && session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, id));

  const records = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.studentId, id), sql`${attendanceTable.dutyHours} IS NOT NULL`));

  const hoursCompleted = records.reduce((sum, r) => sum + (r.dutyHours ?? 0), 0);

  res.json({
    studentId: id,
    hoursCompleted: Math.round(hoursCompleted * 100) / 100,
    hoursRequired: profile?.totalHoursRequired ?? 500,
    progress:
      Math.round((hoursCompleted / (profile?.totalHoursRequired ?? 500)) * 100 * 10) / 10,
  });
});

export default router;
