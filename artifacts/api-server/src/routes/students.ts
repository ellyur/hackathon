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

// ── Face enrollment (face-api.js, client-side embeddings) ────────────────────

import { isValidDescriptor } from "../lib/face-recognition.js";

/**
 * GET /api/students/me/face-descriptor
 * Returns whether the student has a stored face descriptor.
 */
router.get("/students/me/face-descriptor", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.session.userId!));

  if (!profile) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  res.json({ enrolled: Array.isArray(profile.faceDescriptor) && profile.faceDescriptor.length === 128 });
});

/**
 * POST /api/students/me/face-enroll
 * Body: { descriptor: number[] }  — 128-element face embedding from face-api.js
 *
 * Stores the client-computed face descriptor for future verification.
 * Re-enrollment simply overwrites the stored descriptor.
 */
router.post("/students/me/face-enroll", requireAuth, requireRole("student"), async (req, res): Promise<void> => {
  const { descriptor } = req.body as { descriptor?: unknown };

  if (!isValidDescriptor(descriptor)) {
    res.status(400).json({ error: "descriptor must be an array of 128 finite numbers" });
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
    await db
      .update(studentProfilesTable)
      .set({ faceDescriptor: descriptor })
      .where(eq(studentProfilesTable.userId, req.session.userId!));

    res.json({ enrolled: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Face enrollment failed: ${msg}` });
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

  // Build per-case entries
  const entries = cases.map((c) => {
    const studentCompletions = completions.filter((cc) => cc.clinicalCaseId === c.id);
    const verified = studentCompletions.filter((cc) => cc.status === "verified").length;
    const pending  = studentCompletions.filter((cc) => cc.status === "pending").length;
    const completed = verified + pending;
    const remaining = Math.max(0, c.requiredCount - verified);
    const status: "complete" | "in_progress" | "deficient" =
      verified >= c.requiredCount ? "complete"
      : (verified > 0 || pending > 0) ? "in_progress"
      : "deficient";
    return { caseId: c.id, caseName: c.name, category: c.category, required: c.requiredCount, completed, verified, remaining, status };
  });

  // Group by category
  const categoryMap = new Map<string, typeof entries>();
  for (const e of entries) {
    const cat = e.category ?? "Other";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(e);
  }

  const categories = Array.from(categoryMap.entries()).map(([category, cases]) => {
    const totalReq  = cases.reduce((s, c) => s + c.required, 0);
    const totalVer  = cases.reduce((s, c) => s + c.verified, 0);
    const completionRate = totalReq > 0 ? totalVer / totalReq : 0;
    return { category, completionRate, cases };
  });

  const totalCases     = cases.reduce((s, c) => s + c.requiredCount, 0);
  const completedCases = entries.reduce((s, e) => s + e.verified, 0);
  const overallCompletion = totalCases > 0 ? completedCases / totalCases : 0;

  res.json({ studentId: id, totalCases, completedCases, overallCompletion, categories });
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
  const hoursRequired = profile?.totalHoursRequired ?? 500;

  res.json({
    studentId: id,
    totalHoursCompleted: Math.round(hoursCompleted * 100) / 100,
    totalHoursRequired: hoursRequired,
    hoursRemaining: Math.max(0, Math.round((hoursRequired - hoursCompleted) * 100) / 100),
    progressPercent:
      hoursRequired > 0 ? Math.round((hoursCompleted / hoursRequired) * 100 * 10) / 10 : 0,
  });
});

export default router;
