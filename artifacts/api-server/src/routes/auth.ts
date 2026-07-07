import { Router, type IRouter } from "express";
import { users, getUserProfile } from "../lib/mockData.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.passwordHash !== password) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json(getUserProfile(user));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
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
  const user = users.find((u) => u.id === req.session.userId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(getUserProfile(user));
});

export default router;
