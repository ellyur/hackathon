import { Router, type IRouter } from "express";
import { db, announcementsTable, announcementReadsTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const role = req.session.role as string;
  const now = new Date();

  const announcements = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));

  // Filter by target role and expiry
  const filtered = announcements.filter((a) => {
    if (a.expiresAt && a.expiresAt < now) return false;
    return a.targetRole === "all" || a.targetRole === role;
  });

  // Attach read status for current user
  const reads = await db
    .select()
    .from(announcementReadsTable)
    .where(eq(announcementReadsTable.userId, req.session.userId!));
  const readIds = new Set(reads.map((r) => r.announcementId));

  res.json(filtered.map((a) => ({ ...a, isRead: readIds.has(a.id) })));
});

router.post(
  "/announcements",
  requireRole("admin", "scheduler"),
  async (req, res): Promise<void> => {
    const body = req.body as {
      title: string;
      body: string;
      targetRole?: "all" | "student" | "ci" | "scheduler" | "admin";
      isPinned?: boolean;
      expiresAt?: string;
    };

    if (!body.title || !body.body) {
      res.status(400).json({ error: "Title and body are required" });
      return;
    }

    const id = randomUUID();
    await db.insert(announcementsTable).values({
      id,
      title: body.title,
      body: body.body,
      targetRole: body.targetRole ?? "all",
      postedBy: req.session.userId!,
      isPinned: body.isPinned ?? false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });

    const [ann] = await db
      .select()
      .from(announcementsTable)
      .where(eq(announcementsTable.id, id));
    res.status(201).json(ann);
  },
);

router.patch(
  "/announcements/:id",
  requireRole("admin", "scheduler"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const [ann] = await db
      .select()
      .from(announcementsTable)
      .where(eq(announcementsTable.id, id));
    if (!ann) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }

    const body = req.body as Partial<{
      title: string;
      body: string;
      targetRole: "all" | "student" | "ci" | "scheduler" | "admin";
      isPinned: boolean;
      expiresAt: string | null;
    }>;

    await db
      .update(announcementsTable)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.body !== undefined && { body: body.body }),
        ...(body.targetRole !== undefined && { targetRole: body.targetRole }),
        ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
        ...(body.expiresAt !== undefined && {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        }),
      })
      .where(eq(announcementsTable.id, id));

    const [updated] = await db
      .select()
      .from(announcementsTable)
      .where(eq(announcementsTable.id, id));
    res.json(updated);
  },
);

router.delete(
  "/announcements/:id",
  requireRole("admin", "scheduler"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    res.json({ message: "Announcement deleted" });
  },
);

router.post("/announcements/:id/read", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = req.session.userId!;

  // Upsert read record
  const [existing] = await db
    .select()
    .from(announcementReadsTable)
    .where(
      and(
        eq(announcementReadsTable.announcementId, id),
        eq(announcementReadsTable.userId, userId),
      ),
    );

  if (!existing) {
    await db.insert(announcementReadsTable).values({
      announcementId: id,
      userId,
      readAt: new Date(),
    });
  }

  res.json({ message: "Marked as read" });
});

export default router;
