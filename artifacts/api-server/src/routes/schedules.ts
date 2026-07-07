import { Router, type IRouter } from "express";
import {
  schedules, users, hospitals, departments, randomUUID,
  buildScheduleResponse, type ScheduleStatus,
} from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/schedules", requireAuth, async (req, res): Promise<void> => {
  const { studentId, ciId, hospitalId, status, startDate, endDate } = req.query as {
    studentId?: string; ciId?: string; hospitalId?: string; status?: string;
    startDate?: string; endDate?: string;
  };
  const currentRole = req.session.role!;
  const currentUserId = req.session.userId!;

  let result = schedules;

  // Role-based filtering
  if (currentRole === "student") {
    result = result.filter((s) => s.studentIds.includes(currentUserId));
  } else if (currentRole === "ci") {
    result = result.filter((s) => s.ciId === currentUserId);
  }

  if (studentId) result = result.filter((s) => s.studentIds.includes(studentId));
  if (ciId) result = result.filter((s) => s.ciId === ciId);
  if (hospitalId) result = result.filter((s) => s.hospitalId === hospitalId);
  if (status) result = result.filter((s) => s.status === status);
  if (startDate) result = result.filter((s) => s.dutyDate >= startDate);
  if (endDate) result = result.filter((s) => s.dutyDate <= endDate);

  // Sort by duty date descending
  result = [...result].sort((a, b) => b.dutyDate.localeCompare(a.dutyDate));

  res.json(result.map(buildScheduleResponse));
});

router.post("/schedules", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    title?: string; hospitalId: string; departmentId: string; ciId: string;
    dutyDate: string; startTime: string; endTime: string; gracePeriodMin?: number;
    notes?: string; studentIds: string[];
  };
  if (!body.hospitalId || !body.departmentId || !body.ciId || !body.dutyDate || !body.startTime || !body.endTime || !body.studentIds) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const newSchedule = {
    id: randomUUID(),
    title: body.title ?? null,
    hospitalId: body.hospitalId,
    departmentId: body.departmentId,
    ciId: body.ciId,
    dutyDate: body.dutyDate,
    startTime: body.startTime,
    endTime: body.endTime,
    gracePeriodMin: body.gracePeriodMin ?? 15,
    status: "upcoming" as ScheduleStatus,
    notes: body.notes ?? null,
    createdBy: req.session.userId!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    studentIds: body.studentIds,
  };
  schedules.push(newSchedule);
  res.status(201).json(buildScheduleResponse(newSchedule));
});

router.get("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.json(buildScheduleResponse(schedule));
});

router.patch("/schedules/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  // Lock past completed schedules
  if (schedule.status === "completed" || schedule.status === "cancelled") {
    res.status(400).json({ error: "Cannot edit completed or cancelled schedules" });
    return;
  }
  const body = req.body as {
    title?: string; hospitalId?: string; departmentId?: string; ciId?: string;
    dutyDate?: string; startTime?: string; endTime?: string; gracePeriodMin?: number;
    notes?: string; studentIds?: string[]; status?: ScheduleStatus;
  };
  if (body.title !== undefined) schedule.title = body.title;
  if (body.hospitalId !== undefined) schedule.hospitalId = body.hospitalId;
  if (body.departmentId !== undefined) schedule.departmentId = body.departmentId;
  if (body.ciId !== undefined) schedule.ciId = body.ciId;
  if (body.dutyDate !== undefined) schedule.dutyDate = body.dutyDate;
  if (body.startTime !== undefined) schedule.startTime = body.startTime;
  if (body.endTime !== undefined) schedule.endTime = body.endTime;
  if (body.gracePeriodMin !== undefined) schedule.gracePeriodMin = body.gracePeriodMin;
  if (body.notes !== undefined) schedule.notes = body.notes;
  if (body.studentIds !== undefined) schedule.studentIds = body.studentIds;
  if (body.status !== undefined) schedule.status = body.status;
  schedule.updatedAt = new Date().toISOString();
  res.json(buildScheduleResponse(schedule));
});

router.delete("/schedules/:id", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  schedule.status = "cancelled";
  schedule.updatedAt = new Date().toISOString();
  res.json({ message: "Schedule cancelled" });
});

export default router;
