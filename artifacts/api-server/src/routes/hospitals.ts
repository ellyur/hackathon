import { Router, type IRouter } from "express";
import { db, hospitalsTable, departmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// ── Hospitals ─────────────────────────────────────────────────────────────────

router.get("/hospitals", requireAuth, async (_req, res): Promise<void> => {
  const hospitals = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.isActive, true));

  const withDepts = await Promise.all(
    hospitals.map(async (h) => {
      const departments = await db
        .select()
        .from(departmentsTable)
        .where(and(eq(departmentsTable.hospitalId, h.id), eq(departmentsTable.isActive, true)));
      return { ...h, departments };
    }),
  );

  res.json(withDepts);
});

router.post("/hospitals", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    name: string;
    address?: string;
    contactNumber?: string;
    latitude?: number;
    longitude?: number;
    attendanceRadius?: number;
  };
  if (!body.name) {
    res.status(400).json({ error: "Hospital name is required" });
    return;
  }

  const id = randomUUID();
  await db.insert(hospitalsTable).values({
    id,
    name: body.name,
    address: body.address ?? "",
    contactNumber: body.contactNumber ?? "",
    latitude: body.latitude ?? 0,
    longitude: body.longitude ?? 0,
    attendanceRadius: body.attendanceRadius ?? 100,
    isActive: true,
  });

  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.id, id));
  res.status(201).json(hospital);
});

router.patch("/hospitals/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const { id } = req.params;
  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.id, id));
  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const body = req.body as Partial<{
    name: string;
    address: string;
    contactNumber: string;
    latitude: number;
    longitude: number;
    attendanceRadius: number;
    isActive: boolean;
  }>;

  await db
    .update(hospitalsTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.contactNumber !== undefined && { contactNumber: body.contactNumber }),
      ...(body.latitude !== undefined && { latitude: body.latitude }),
      ...(body.longitude !== undefined && { longitude: body.longitude }),
      ...(body.attendanceRadius !== undefined && { attendanceRadius: body.attendanceRadius }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    })
    .where(eq(hospitalsTable.id, id));

  const [updated] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.id, id));
  res.json(updated);
});

// ── Departments ───────────────────────────────────────────────────────────────

/**
 * GET /api/hospitals/:id/departments
 * Returns all departments for a hospital (active + inactive for admin use).
 */
router.get("/hospitals/:id/departments", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const includeInactive = req.query.includeInactive === "true";

  const whereClause = includeInactive
    ? eq(departmentsTable.hospitalId, id)
    : and(eq(departmentsTable.hospitalId, id), eq(departmentsTable.isActive, true));

  const departments = await db.select().from(departmentsTable).where(whereClause);
  res.json(departments);
});

/**
 * POST /api/hospitals/:id/departments
 * Create a new department within a hospital.
 */
router.post("/hospitals/:id/departments", requireRole("admin"), async (req, res): Promise<void> => {
  const { id: hospitalId } = req.params;
  const [hospital] = await db
    .select()
    .from(hospitalsTable)
    .where(eq(hospitalsTable.id, hospitalId));
  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const body = req.body as {
    name: string;
    code?: string;
    requiredDutyDays?: number;
    requiredDutyHours?: number;
  };
  if (!body.name) {
    res.status(400).json({ error: "Department name is required" });
    return;
  }

  const deptId = randomUUID();
  await db.insert(departmentsTable).values({
    id: deptId,
    hospitalId,
    name: body.name,
    code: body.code ?? "",
    isActive: true,
    requiredDutyDays: body.requiredDutyDays ?? 0,
    requiredDutyHours: body.requiredDutyHours ?? 0,
  });

  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, deptId));
  res.status(201).json(dept);
});

/**
 * PATCH /api/hospitals/:hospitalId/departments/:deptId
 * Update a department (name, code, duty days, active state).
 */
router.patch("/hospitals/:hospitalId/departments/:deptId", requireRole("admin"), async (req, res): Promise<void> => {
  const { hospitalId, deptId } = req.params;

  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(and(eq(departmentsTable.id, deptId), eq(departmentsTable.hospitalId, hospitalId)));

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const body = req.body as Partial<{
    name: string;
    code: string;
    isActive: boolean;
    requiredDutyDays: number;
    requiredDutyHours: number;
  }>;

  await db
    .update(departmentsTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.requiredDutyDays !== undefined && { requiredDutyDays: body.requiredDutyDays }),
      ...(body.requiredDutyHours !== undefined && { requiredDutyHours: body.requiredDutyHours }),
    })
    .where(eq(departmentsTable.id, deptId));

  const [updated] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, deptId));
  res.json(updated);
});

/**
 * DELETE /api/hospitals/:hospitalId/departments/:deptId
 * Soft-delete a department (sets isActive = false).
 */
router.delete("/hospitals/:hospitalId/departments/:deptId", requireRole("admin"), async (req, res): Promise<void> => {
  const { hospitalId, deptId } = req.params;

  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(and(eq(departmentsTable.id, deptId), eq(departmentsTable.hospitalId, hospitalId)));

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  await db
    .update(departmentsTable)
    .set({ isActive: false })
    .where(eq(departmentsTable.id, deptId));

  res.json({ success: true });
});

export default router;
