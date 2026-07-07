import { Router, type IRouter } from "express";
import {
  dutySlots, dutyApplications, randomUUID,
  buildSlotResponse, buildApplicationResponse, type SlotStatus,
} from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/slots", requireAuth, async (req, res): Promise<void> => {
  const { status, isMakeup, hospitalId } = req.query as { status?: string; isMakeup?: string; hospitalId?: string };
  let result = dutySlots;
  if (status) result = result.filter((s) => s.status === status);
  if (isMakeup !== undefined) result = result.filter((s) => s.isMakeup === (isMakeup === "true"));
  if (hospitalId) result = result.filter((s) => s.hospitalId === hospitalId);
  res.json(result.map(buildSlotResponse));
});

router.post("/slots", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    hospitalId: string; departmentId: string; ciId?: string;
    dutyDate: string; startTime: string; endTime: string; maxStudents: number;
    isMakeup?: boolean; description?: string;
  };
  if (!body.hospitalId || !body.departmentId || !body.dutyDate || !body.startTime || !body.endTime || !body.maxStudents) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const newSlot = {
    id: randomUUID(),
    hospitalId: body.hospitalId,
    departmentId: body.departmentId,
    ciId: body.ciId ?? null,
    dutyDate: body.dutyDate,
    startTime: body.startTime,
    endTime: body.endTime,
    maxStudents: body.maxStudents,
    isMakeup: body.isMakeup ?? false,
    description: body.description ?? null,
    status: "open" as SlotStatus,
    createdBy: req.session.userId!,
    createdAt: new Date().toISOString(),
  };
  dutySlots.push(newSlot);
  res.status(201).json(buildSlotResponse(newSlot));
});

router.patch("/slots/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const slot = dutySlots.find((s) => s.id === id);
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }
  const body = req.body as Partial<typeof slot>;
  Object.assign(slot, body);
  res.json(buildSlotResponse(slot));
});

router.delete("/slots/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const slot = dutySlots.find((s) => s.id === id);
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }
  slot.status = "cancelled";
  res.json({ message: "Slot cancelled" });
});

router.post("/slots/:id/apply", requireRole("student"), async (req, res): Promise<void> => {
  const slotId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const slot = dutySlots.find((s) => s.id === slotId);
  if (!slot || slot.status !== "open") {
    res.status(400).json({ error: "Slot is not available for applications" });
    return;
  }
  const studentId = req.session.userId!;
  const existing = dutyApplications.find((a) => a.slotId === slotId && a.studentId === studentId);
  if (existing) {
    res.status(400).json({ error: "Already applied for this slot" });
    return;
  }
  const newApp = {
    id: randomUUID(),
    slotId,
    studentId,
    appliedAt: new Date().toISOString(),
    status: "pending" as const,
    reviewedBy: null,
    reviewedAt: null,
    notes: null,
  };
  dutyApplications.push(newApp);
  res.status(201).json(buildApplicationResponse(newApp));
});

router.get("/slots/:id/applications", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const slotId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const apps = dutyApplications.filter((a) => a.slotId === slotId);
  res.json(apps.map(buildApplicationResponse));
});

router.patch("/slots/:id/applications/:appId", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const appId = Array.isArray(req.params.appId) ? req.params.appId[0] : req.params.appId;
  const app = dutyApplications.find((a) => a.id === appId);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const { status, notes } = req.body as { status: "approved" | "rejected"; notes?: string };
  app.status = status;
  app.reviewedBy = req.session.userId!;
  app.reviewedAt = new Date().toISOString();
  app.notes = notes ?? null;
  res.json(buildApplicationResponse(app));
});

export default router;
