import { Router, type IRouter } from "express";
import { db, academicYearSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// GET /academic-year-settings — list all configurations
router.get("/academic-year-settings", requireRole("admin", "scheduler"), async (_req, res): Promise<void> => {
  const settings = await db
    .select()
    .from(academicYearSettingsTable)
    .orderBy(academicYearSettingsTable.schoolYear, academicYearSettingsTable.semester);
  res.json(settings);
});

// POST /academic-year-settings — create a new configuration
router.post("/academic-year-settings", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    schoolYear: string;
    semester: string;
    requiredTotalDutyHours: number;
  };

  if (!body.schoolYear || !body.semester || body.requiredTotalDutyHours == null) {
    res.status(400).json({ error: "schoolYear, semester, and requiredTotalDutyHours are required" });
    return;
  }

  const id = randomUUID();
  await db.insert(academicYearSettingsTable).values({
    id,
    schoolYear: body.schoolYear,
    semester: body.semester,
    requiredTotalDutyHours: Number(body.requiredTotalDutyHours),
  });

  const [setting] = await db
    .select()
    .from(academicYearSettingsTable)
    .where(eq(academicYearSettingsTable.id, id));
  res.status(201).json(setting);
});

// PATCH /academic-year-settings/:id — update a configuration
router.patch("/academic-year-settings/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [existing] = await db
    .select()
    .from(academicYearSettingsTable)
    .where(eq(academicYearSettingsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Setting not found" });
    return;
  }

  const body = req.body as Partial<{
    schoolYear: string;
    semester: string;
    requiredTotalDutyHours: number;
  }>;

  await db
    .update(academicYearSettingsTable)
    .set({
      ...(body.schoolYear !== undefined && { schoolYear: body.schoolYear }),
      ...(body.semester !== undefined && { semester: body.semester }),
      ...(body.requiredTotalDutyHours !== undefined && {
        requiredTotalDutyHours: Number(body.requiredTotalDutyHours),
      }),
      updatedAt: new Date(),
    })
    .where(eq(academicYearSettingsTable.id, id));

  const [updated] = await db
    .select()
    .from(academicYearSettingsTable)
    .where(eq(academicYearSettingsTable.id, id));
  res.json(updated);
});

// DELETE /academic-year-settings/:id — remove a configuration
router.delete("/academic-year-settings/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [existing] = await db
    .select()
    .from(academicYearSettingsTable)
    .where(eq(academicYearSettingsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Setting not found" });
    return;
  }

  await db.delete(academicYearSettingsTable).where(eq(academicYearSettingsTable.id, id));
  res.json({ message: "Setting deleted" });
});

export default router;
