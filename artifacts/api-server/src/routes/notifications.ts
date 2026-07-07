import { Router, type IRouter } from "express";
import { notifications } from "../lib/mockData.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { isRead } = req.query as { isRead?: string };
  const userId = req.session.userId!;

  let result = notifications.filter((n) => n.userId === userId);
  if (isRead !== undefined) result = result.filter((n) => n.isRead === (isRead === "true"));

  // Sort newest first
  result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(result);
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const notif = notifications.find((n) => n.id === id && n.userId === req.session.userId);
  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  notif.isRead = true;
  notif.readAt = new Date().toISOString();
  res.json(notif);
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const now = new Date().toISOString();
  notifications
    .filter((n) => n.userId === userId && !n.isRead)
    .forEach((n) => {
      n.isRead = true;
      n.readAt = now;
    });
  res.json({ message: "All notifications marked as read" });
});

export default router;
