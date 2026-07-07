import { Router, type IRouter } from "express";
import { announcements, announcementReads, users, randomUUID } from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const userRole = req.session.role!;

  const visible = announcements.filter((a) => {
    if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
    return a.targetRole === "all" || a.targetRole === userRole;
  });

  const result = visible
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .map((ann) => {
      const poster = ann.postedBy ? users.find((u) => u.id === ann.postedBy) : null;
      const isRead = announcementReads.some((r) => r.announcementId === ann.id && r.userId === userId);
      const readCount = announcementReads.filter((r) => r.announcementId === ann.id).length;
      return {
        ...ann,
        isRead,
        readCount,
        poster: poster ? { id: poster.id, firstName: poster.firstName, lastName: poster.lastName, email: poster.email, role: poster.role, isActive: poster.isActive, avatarUrl: poster.avatarUrl } : null,
      };
    });

  res.json(result);
});

router.post("/announcements", requireRole("admin", "scheduler"), async (req, res): Promise<void> => {
  const body = req.body as {
    title: string; body: string; targetRole: string; isPinned?: boolean; expiresAt?: string;
  };
  if (!body.title || !body.body || !body.targetRole) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const newAnn = {
    id: randomUUID(),
    title: body.title,
    body: body.body,
    targetRole: body.targetRole as "all" | "student" | "ci" | "scheduler" | "admin",
    postedBy: req.session.userId!,
    isPinned: body.isPinned ?? false,
    expiresAt: body.expiresAt ?? null,
    createdAt: new Date().toISOString(),
  };
  announcements.push(newAnn);
  const poster = users.find((u) => u.id === newAnn.postedBy);
  res.status(201).json({
    ...newAnn, isRead: false, readCount: 0,
    poster: poster ? { id: poster.id, firstName: poster.firstName, lastName: poster.lastName, email: poster.email, role: poster.role, isActive: poster.isActive, avatarUrl: poster.avatarUrl } : null,
  });
});

router.patch("/announcements/:id", requireRole("admin", "scheduler"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ann = announcements.find((a) => a.id === id);
  if (!ann) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  const body = req.body as { title?: string; body?: string; targetRole?: string; isPinned?: boolean; expiresAt?: string };
  if (body.title !== undefined) ann.title = body.title;
  if (body.body !== undefined) ann.body = body.body;
  if (body.targetRole !== undefined) ann.targetRole = body.targetRole as typeof ann.targetRole;
  if (body.isPinned !== undefined) ann.isPinned = body.isPinned;
  if (body.expiresAt !== undefined) ann.expiresAt = body.expiresAt;
  const readCount = announcementReads.filter((r) => r.announcementId === id).length;
  res.json({ ...ann, isRead: false, readCount, poster: null });
});

router.delete("/announcements/:id", requireRole("admin", "scheduler"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const index = announcements.findIndex((a) => a.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  announcements.splice(index, 1);
  res.json({ message: "Announcement deleted" });
});

router.post("/announcements/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.session.userId!;
  const existing = announcementReads.find((r) => r.announcementId === id && r.userId === userId);
  if (!existing) {
    announcementReads.push({ announcementId: id, userId, readAt: new Date().toISOString() });
  }
  res.json({ message: "Marked as read" });
});

export default router;
