import { Router, type IRouter } from "express";
import {
  clinicalCases, caseCompletions, users,
  buildCaseCompletionResponse, randomUUID, auditLogs,
} from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

// Clinical Cases
router.get("/cases", requireAuth, async (_req, res): Promise<void> => {
  res.json(clinicalCases.filter((c) => c.isActive));
});

router.post("/cases", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    name: string; description?: string; category: string; requiredCount: number; isActive?: boolean;
  };
  if (!body.name || !body.category || !body.requiredCount) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const newCase = {
    id: randomUUID(),
    name: body.name,
    description: body.description ?? "",
    category: body.category,
    requiredCount: body.requiredCount,
    isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(),
  };
  clinicalCases.push(newCase);
  res.status(201).json(newCase);
});

router.patch("/cases/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const c = clinicalCases.find((c) => c.id === id);
  if (!c) {
    res.status(404).json({ error: "Clinical case not found" });
    return;
  }
  const body = req.body as { name?: string; description?: string; category?: string; requiredCount?: number; isActive?: boolean };
  if (body.name !== undefined) c.name = body.name;
  if (body.description !== undefined) c.description = body.description;
  if (body.category !== undefined) c.category = body.category;
  if (body.requiredCount !== undefined) c.requiredCount = body.requiredCount;
  if (body.isActive !== undefined) c.isActive = body.isActive;
  res.json(c);
});

// Case Completions
router.get("/case-completions", requireAuth, async (req, res): Promise<void> => {
  const { studentId, status, scheduleId } = req.query as { studentId?: string; status?: string; scheduleId?: string };
  const currentUserId = req.session.userId!;
  const currentRole = req.session.role!;

  let result = caseCompletions;

  // Students can only see their own
  if (currentRole === "student") {
    result = result.filter((cc) => cc.studentId === currentUserId);
  } else {
    if (studentId) result = result.filter((cc) => cc.studentId === studentId);
  }
  if (status) result = result.filter((cc) => cc.status === status);
  if (scheduleId) result = result.filter((cc) => cc.scheduleId === scheduleId);

  res.json(result.map(buildCaseCompletionResponse));
});

router.post("/case-completions", requireAuth, async (req, res): Promise<void> => {
  const currentRole = req.session.role!;
  if (currentRole !== "student") {
    res.status(403).json({ error: "Only students can submit case completions" });
    return;
  }
  const body = req.body as {
    clinicalCaseId: string; scheduleId: string; hospitalId: string; departmentId: string;
    notes?: string; photoUrl?: string;
  };
  if (!body.clinicalCaseId || !body.scheduleId || !body.hospitalId || !body.departmentId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const newCC = {
    id: randomUUID(),
    studentId: req.session.userId!,
    clinicalCaseId: body.clinicalCaseId,
    scheduleId: body.scheduleId,
    hospitalId: body.hospitalId,
    departmentId: body.departmentId,
    submittedAt: new Date().toISOString(),
    verifiedAt: null,
    verifiedBy: null,
    status: "pending" as const,
    rejectionReason: null,
    notes: body.notes ?? null,
    photoUrl: body.photoUrl ?? null,
  };
  caseCompletions.push(newCC);
  res.status(201).json(buildCaseCompletionResponse(newCC));
});

router.patch("/case-completions/:id/verify", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const cc = caseCompletions.find((c) => c.id === id);
  if (!cc) {
    res.status(404).json({ error: "Case completion not found" });
    return;
  }
  const oldStatus = cc.status;
  cc.status = "verified";
  cc.verifiedAt = new Date().toISOString();
  cc.verifiedBy = req.session.userId!;
  auditLogs.push({
    id: randomUUID(),
    userId: req.session.userId!,
    action: "case_verified",
    entityType: "case_completion",
    entityId: id,
    oldValue: { status: oldStatus },
    newValue: { status: "verified" },
    ipAddress: req.ip ?? "unknown",
    createdAt: new Date().toISOString(),
  });
  res.json(buildCaseCompletionResponse(cc));
});

router.patch("/case-completions/:id/reject", requireRole("scheduler", "admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const cc = caseCompletions.find((c) => c.id === id);
  if (!cc) {
    res.status(404).json({ error: "Case completion not found" });
    return;
  }
  const { rejectionReason } = req.body as { rejectionReason: string };
  if (!rejectionReason) {
    res.status(400).json({ error: "Rejection reason is required" });
    return;
  }
  const oldStatus = cc.status;
  cc.status = "rejected";
  cc.rejectionReason = rejectionReason;
  auditLogs.push({
    id: randomUUID(),
    userId: req.session.userId!,
    action: "case_rejected",
    entityType: "case_completion",
    entityId: id,
    oldValue: { status: oldStatus },
    newValue: { status: "rejected", rejectionReason },
    ipAddress: req.ip ?? "unknown",
    createdAt: new Date().toISOString(),
  });
  res.json(buildCaseCompletionResponse(cc));
});

export default router;
