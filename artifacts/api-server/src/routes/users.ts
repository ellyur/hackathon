import { Router, type IRouter } from "express";
import { db, usersTable, studentProfilesTable, ciProfilesTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

async function getUserProfile(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const [studentProfile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, userId));
  const [ciProfile] = await db
    .select()
    .from(ciProfilesTable)
    .where(eq(ciProfilesTable.userId, userId));
  const { passwordHash: _pw, ...safeUser } = user;
  return { ...safeUser, studentProfile: studentProfile ?? null, ciProfile: ciProfile ?? null };
}

router.get("/users", requireRole("admin", "scheduler"), async (req, res): Promise<void> => {
  const { role, isActive, search } = req.query as {
    role?: string;
    isActive?: string;
    search?: string;
  };

  let query = db.select().from(usersTable);
  const conditions = [];

  if (role) conditions.push(eq(usersTable.role, role as "admin" | "scheduler" | "ci" | "student"));
  if (isActive !== undefined)
    conditions.push(eq(usersTable.isActive, isActive === "true"));
  if (search) {
    const q = `%${search}%`;
    conditions.push(
      or(ilike(usersTable.firstName, q), ilike(usersTable.lastName, q), ilike(usersTable.email, q)),
    );
  }

  const users = conditions.length
    ? await (query.where(and(...conditions)) as typeof query)
    : await query;

  const profiles = await Promise.all(users.map((u) => getUserProfile(u.id)));
  res.json(profiles.filter(Boolean));
});

router.post("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    email: string;
    password: string;
    role: "admin" | "scheduler" | "ci" | "student";
    firstName: string;
    lastName: string;
    phone?: string;
    studentNumber?: string;
    yearLevel?: number;
    section?: string;
    program?: string;
    academicYear?: string;
    employeeId?: string;
    specialization?: string;
  };

  if (!body.email || !body.password || !body.role || !body.firstName || !body.lastName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, body.email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const newId = randomUUID();

  await db.insert(usersTable).values({
    id: newId,
    email: body.email.toLowerCase(),
    passwordHash,
    role: body.role,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone ?? null,
    avatarUrl: null,
    isActive: true,
  });

  if (body.role === "student") {
    await db.insert(studentProfilesTable).values({
      id: randomUUID(),
      userId: newId,
      studentNumber: body.studentNumber ?? `BSN-${Date.now()}`,
      yearLevel: body.yearLevel ?? 1,
      section: body.section ?? "A",
      program: body.program ?? "BSN",
      academicYear: body.academicYear ?? "2024-2025",
      totalHoursRequired: 500,
    });
  }

  if (body.role === "ci") {
    await db.insert(ciProfilesTable).values({
      id: randomUUID(),
      userId: newId,
      employeeId: body.employeeId ?? `CI-${Date.now()}`,
      specialization: body.specialization ?? "General",
    });
  }

  const profile = await getUserProfile(newId);
  res.status(201).json(profile);
});

/**
 * POST /api/users/import
 * Bulk-create users from a CSV-parsed array.
 * Body: { users: Array<UserInput> }
 * Returns: { created, failed, results: [{row, name, email, status, error?}] }
 */
router.post("/users/import", requireRole("admin"), async (req, res): Promise<void> => {
  const { users: rows } = req.body as { users?: unknown[] };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "users must be a non-empty array" });
    return;
  }

  type RowResult = { row: number; name: string; email: string; status: "ok" | "error"; error?: string };
  const results: RowResult[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const body = rows[i] as {
      email?: string; password?: string; role?: string;
      firstName?: string; lastName?: string; phone?: string;
      studentNumber?: string; yearLevel?: number; section?: string;
      program?: string; academicYear?: string;
      employeeId?: string; specialization?: string;
    };

    const name = `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim();
    const email = body.email?.toLowerCase() ?? "";

    try {
      if (!body.email || !body.password || !body.role || !body.firstName || !body.lastName) {
        throw new Error("Missing required fields");
      }
      const validRoles = ["admin", "scheduler", "ci", "student"];
      if (!validRoles.includes(body.role)) throw new Error(`Invalid role: ${body.role}`);
      if (body.password.length < 8) throw new Error("Password must be at least 8 characters");

      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
      if (existing) throw new Error("Email already in use");

      const passwordHash = await bcrypt.hash(body.password, 10);
      const newId = randomUUID();

      await db.insert(usersTable).values({
        id: newId, email, passwordHash,
        role: body.role as "admin" | "scheduler" | "ci" | "student",
        firstName: body.firstName, lastName: body.lastName,
        phone: body.phone ?? null, avatarUrl: null, isActive: true,
      });

      if (body.role === "student") {
        await db.insert(studentProfilesTable).values({
          id: randomUUID(), userId: newId,
          studentNumber: body.studentNumber ?? `BSN-${Date.now()}-${i}`,
          yearLevel: body.yearLevel ?? 1, section: body.section ?? "A",
          program: body.program ?? "BSN", academicYear: body.academicYear ?? "2024-2025",
          totalHoursRequired: 500,
        });
      }
      if (body.role === "ci") {
        await db.insert(ciProfilesTable).values({
          id: randomUUID(), userId: newId,
          employeeId: body.employeeId ?? `CI-${Date.now()}-${i}`,
          specialization: body.specialization ?? "General",
        });
      }

      results.push({ row: i + 1, name, email, status: "ok" });
      created++;
    } catch (err: any) {
      results.push({ row: i + 1, name, email, status: "error", error: err?.message ?? "Unknown error" });
      failed++;
    }
  }

  res.json({ created, failed, results });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const profile = await getUserProfile(id);
  if (!profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(profile);
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const session = req.session;
  const isAdmin = session.role === "admin";
  const isSelf = session.userId === id;

  // Only admins can modify other accounts; any user can update their own profile
  if (!isAdmin && !isSelf) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const body = req.body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    // admin-only fields:
    isActive?: boolean;
    password?: string;
    section?: string;
    yearLevel?: number;
  };

  const userUpdates: Partial<typeof usersTable.$inferInsert> = {};
  // Fields any user can change on their own profile
  if (body.firstName !== undefined) userUpdates.firstName = body.firstName;
  if (body.lastName !== undefined) userUpdates.lastName = body.lastName;
  if (body.phone !== undefined) userUpdates.phone = body.phone;
  if (body.avatarUrl !== undefined) userUpdates.avatarUrl = body.avatarUrl;
  // Password change — allowed for self or admin
  if (body.password) userUpdates.passwordHash = await bcrypt.hash(body.password, 10);
  // Admin-only: activate/deactivate
  if (isAdmin && body.isActive !== undefined) userUpdates.isActive = body.isActive;

  if (Object.keys(userUpdates).length > 0) {
    await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, id));
  }

  // Student profile fields — self or admin
  if (body.section !== undefined || body.yearLevel !== undefined) {
    const profileUpdates: Partial<typeof studentProfilesTable.$inferInsert> = {};
    if (body.section !== undefined) profileUpdates.section = body.section;
    if (body.yearLevel !== undefined) profileUpdates.yearLevel = body.yearLevel;
    await db
      .update(studentProfilesTable)
      .set(profileUpdates)
      .where(eq(studentProfilesTable.userId, id));
  }

  const profile = await getUserProfile(id);
  res.json(profile);
});

router.delete("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
  res.json({ message: "User deactivated" });
});

export default router;
