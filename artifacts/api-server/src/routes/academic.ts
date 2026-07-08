import { Router, type IRouter } from "express";
import { db, academicListItemsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

const VALID_TYPES = ["section", "year_level", "semester", "school_year"] as const;
type ListType = (typeof VALID_TYPES)[number];

router.get("/academic-lists", requireAuth, async (req, res): Promise<void> => {
  const { type } = req.query as { type?: string };
  if (type && !VALID_TYPES.includes(type as ListType)) {
    res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(", ")}` });
    return;
  }

  const items = type
    ? await db
        .select()
        .from(academicListItemsTable)
        .where(eq(academicListItemsTable.type, type as ListType))
        .orderBy(asc(academicListItemsTable.sortOrder))
    : await db.select().from(academicListItemsTable).orderBy(asc(academicListItemsTable.sortOrder));

  res.json(items);
});

router.post("/academic-lists", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as { type: string; label: string; sortOrder?: number };
  if (!body.type || !VALID_TYPES.includes(body.type as ListType)) {
    res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(", ")}` });
    return;
  }
  if (!body.label) {
    res.status(400).json({ error: "label is required" });
    return;
  }

  const id = randomUUID();
  await db.insert(academicListItemsTable).values({
    id,
    type: body.type as ListType,
    label: body.label,
    sortOrder: body.sortOrder ?? 0,
    isActive: true,
  });

  const [item] = await db.select().from(academicListItemsTable).where(eq(academicListItemsTable.id, id));
  res.status(201).json(item);
});

router.patch("/academic-lists/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [item] = await db.select().from(academicListItemsTable).where(eq(academicListItemsTable.id, id));
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const body = req.body as Partial<{ label: string; sortOrder: number; isActive: boolean }>;
  await db
    .update(academicListItemsTable)
    .set({
      ...(body.label !== undefined && { label: body.label }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    })
    .where(eq(academicListItemsTable.id, id));

  const [updated] = await db.select().from(academicListItemsTable).where(eq(academicListItemsTable.id, id));
  res.json(updated);
});

router.delete("/academic-lists/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [item] = await db.select().from(academicListItemsTable).where(eq(academicListItemsTable.id, id));
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  await db.delete(academicListItemsTable).where(eq(academicListItemsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
