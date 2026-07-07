import { Router, type IRouter } from "express";
import { db, usersTable, studentProfilesTable, ciProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

async function getUserProfile(userId: string) {
  const [[user], [studentProfile], [ciProfile]] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)),
    db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, userId)),
    db.select().from(ciProfilesTable).where(eq(ciProfilesTable.userId, userId)),
  ]);
  if (!user) return null;
  const { passwordHash: _pw, ...safeUser } = user;
  return { ...safeUser, studentProfile: studentProfile ?? null, ciProfile: ciProfile ?? null };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  const profile = await getUserProfile(user.id);
  res.json(profile);
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to end session" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const profile = await getUserProfile(req.session.userId!);
  if (!profile) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(profile);
});

export default router;
