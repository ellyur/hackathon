import { Router, type IRouter } from "express";
import { hospitals, departments, randomUUID } from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/hospitals", requireAuth, async (_req, res): Promise<void> => {
  const result = hospitals.map((h) => ({
    ...h,
    departments: departments.filter((d) => d.hospitalId === h.id),
  }));
  res.json(result);
});

router.post("/hospitals", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    name: string; address?: string; contactNumber?: string;
    latitude?: number; longitude?: number; attendanceRadius?: number; isActive?: boolean;
  };
  if (!body.name) {
    res.status(400).json({ error: "Hospital name is required" });
    return;
  }
  const newHospital = {
    id: randomUUID(),
    name: body.name,
    address: body.address ?? "",
    contactNumber: body.contactNumber ?? "",
    latitude: body.latitude ?? 0,
    longitude: body.longitude ?? 0,
    attendanceRadius: body.attendanceRadius ?? 100,
    isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(),
  };
  hospitals.push(newHospital);
  res.status(201).json({ ...newHospital, departments: [] });
});

router.patch("/hospitals/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const hospital = hospitals.find((h) => h.id === id);
  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }
  const body = req.body as {
    name?: string; address?: string; contactNumber?: string;
    latitude?: number; longitude?: number; attendanceRadius?: number; isActive?: boolean;
  };
  if (body.name !== undefined) hospital.name = body.name;
  if (body.address !== undefined) hospital.address = body.address;
  if (body.contactNumber !== undefined) hospital.contactNumber = body.contactNumber;
  if (body.latitude !== undefined) hospital.latitude = body.latitude;
  if (body.longitude !== undefined) hospital.longitude = body.longitude;
  if (body.attendanceRadius !== undefined) hospital.attendanceRadius = body.attendanceRadius;
  if (body.isActive !== undefined) hospital.isActive = body.isActive;
  res.json({ ...hospital, departments: departments.filter((d) => d.hospitalId === id) });
});

router.get("/hospitals/:id/departments", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  res.json(departments.filter((d) => d.hospitalId === id));
});

router.post("/hospitals/:id/departments", requireRole("admin"), async (req, res): Promise<void> => {
  const hospitalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }
  const body = req.body as { name: string; code?: string; isActive?: boolean };
  if (!body.name) {
    res.status(400).json({ error: "Department name is required" });
    return;
  }
  const newDept = {
    id: randomUUID(),
    hospitalId,
    name: body.name,
    code: body.code ?? "",
    isActive: body.isActive ?? true,
  };
  departments.push(newDept);
  res.status(201).json(newDept);
});

export default router;
