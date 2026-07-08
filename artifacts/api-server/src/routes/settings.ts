import { Router, type IRouter } from "express";
import { db, systemSettingsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

const SINGLETON_ID = "singleton";

/** Ensure the singleton row exists, returning it. */
async function getOrCreateSettings() {
  const [existing] = await db.select().from(systemSettingsTable);
  if (existing) return existing;
  await db.insert(systemSettingsTable).values({ id: SINGLETON_ID }).onConflictDoNothing();
  const [created] = await db.select().from(systemSettingsTable);
  return created;
}

/**
 * GET /api/settings
 * Any authenticated admin can read system settings.
 */
router.get("/settings", requireRole("admin"), async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

/**
 * PATCH /api/settings
 * Admin updates one or more settings fields.
 * Body: Partial<SystemSettings> (any subset of fields).
 */
router.patch("/settings", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as Partial<typeof systemSettingsTable.$inferInsert>;

  // Prevent overwriting the primary key
  delete (body as any).id;

  await getOrCreateSettings(); // ensure row exists

  await db
    .update(systemSettingsTable)
    .set({ ...body, updatedAt: new Date() });

  const [updated] = await db.select().from(systemSettingsTable);
  res.json(updated);
});

export default router;
