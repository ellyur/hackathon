import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  studentProfilesTable,
  ciProfilesTable,
  passwordResetTokensTable,
} from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID, randomBytes } from "crypto";
import { requireAuth } from "../middlewares/auth.js";
import { signToken } from "../lib/jwt.js";

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

  const profile = await getUserProfile(user.id);
  const token = signToken({ userId: user.id, role: user.role });

  // Best-effort session save (may not work in all proxy environments)
  req.session.userId = user.id;
  req.session.role = user.role;
  await new Promise<void>((resolve) => req.session.save(() => resolve()));

  res.json({ ...profile, token });
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

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  // Always respond with 200 to avoid leaking which emails are registered.
  if (!user || !user.isActive) {
    res.json({ message: "If an account exists for that email, a reset link has been issued." });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await db.insert(passwordResetTokensTable).values({
    id: randomUUID(),
    userId: user.id,
    token,
    expiresAt,
  });

  // No email provider is configured for this project.
  // In development only, return the token so the UI can build the reset link.
  // In production, tokens must be delivered out-of-band (email/SMS).
  const isDev = process.env.NODE_ENV !== "production";
  res.json({
    message: "If an account exists for that email, a reset link has been issued.",
    ...(isDev ? { resetToken: token, expiresAt } : {}),
  });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [resetRecord] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  if (!resetRecord) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, resetRecord.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, resetRecord.id));

  res.json({ message: "Password has been reset. You can now log in." });
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
