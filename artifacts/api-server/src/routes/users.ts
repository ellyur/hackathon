import { Router, type IRouter } from "express";
import { users, studentProfiles, ciProfiles, getUserProfile, randomUUID, type Role } from "../lib/mockData.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const { role, isActive, search } = req.query as { role?: string; isActive?: string; search?: string };

  let result = users.map((u) => getUserProfile(u));

  if (role) result = result.filter((u) => u.role === role);
  if (isActive !== undefined) result = result.filter((u) => u.isActive === (isActive === "true"));
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  res.json(result);
});

router.post("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const body = req.body as {
    email: string;
    password: string;
    role: Role;
    firstName: string;
    lastName: string;
    phone?: string;
    studentNumber?: string;
    yearLevel?: number;
    section?: string;
    program?: string;
    academicYear?: string;
    employeeId?: string;
    specialization?: string;
  };

  if (!body.email || !body.password || !body.role || !body.firstName || !body.lastName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (users.find((u) => u.email === body.email)) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const newUser = {
    id: randomUUID(),
    email: body.email,
    passwordHash: body.password,
    role: body.role,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone ?? null,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  if (body.role === "student") {
    studentProfiles.push({
      id: randomUUID(),
      userId: newUser.id,
      studentNumber: body.studentNumber ?? `BSN-${Date.now()}`,
      yearLevel: body.yearLevel ?? 1,
      section: body.section ?? "A",
      program: body.program ?? "BSN",
      academicYear: body.academicYear ?? "2024-2025",
      totalHoursRequired: 500,
      createdAt: new Date().toISOString(),
    });
  }

  if (body.role === "ci") {
    ciProfiles.push({
      id: randomUUID(),
      userId: newUser.id,
      employeeId: body.employeeId ?? `CI-${Date.now()}`,
      specialization: body.specialization ?? "General",
    });
  }

  res.status(201).json(getUserProfile(newUser));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(getUserProfile(user));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const body = req.body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    isActive?: boolean;
    section?: string;
    yearLevel?: number;
  };

  if (body.firstName !== undefined) user.firstName = body.firstName;
  if (body.lastName !== undefined) user.lastName = body.lastName;
  if (body.phone !== undefined) user.phone = body.phone;
  if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl;
  if (body.isActive !== undefined) user.isActive = body.isActive;

  const profile = studentProfiles.find((sp) => sp.userId === id);
  if (profile) {
    if (body.section !== undefined) profile.section = body.section;
    if (body.yearLevel !== undefined) profile.yearLevel = body.yearLevel;
  }

  res.json(getUserProfile(user));
});

router.delete("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  user.isActive = false;
  res.json({ message: "User deactivated" });
});

export default router;
