import { Router, type IRouter } from "express";
import {
  users, studentProfiles, clinicalCases, caseCompletions, attendance,
  buildStudentDetail, getStudentHoursCompleted,
  type MockUser,
} from "../lib/mockData.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const { search, needsMakeup, hospitalId, caseId, minHours, maxHours } = req.query as {
    search?: string; needsMakeup?: string; hospitalId?: string; caseId?: string;
    minHours?: string; maxHours?: string;
  };

  let students: MockUser[] = users.filter((u) => u.role === "student" && u.isActive);

  if (search) {
    const q = search.toLowerCase();
    students = students.filter(
      (u) => u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  let results = students.map((u) => buildStudentDetail(u));

  if (needsMakeup === "true") results = results.filter((s) => s.needsMakeup);
  if (minHours !== undefined) results = results.filter((s) => s.totalHoursCompleted >= Number(minHours));
  if (maxHours !== undefined) results = results.filter((s) => s.totalHoursCompleted <= Number(maxHours));

  // Filter by students who still need a specific case type
  if (caseId) {
    results = results.filter((s) => {
      const clinicalCase = clinicalCases.find((c) => c.id === caseId);
      if (!clinicalCase) return false;
      const verifiedCount = caseCompletions.filter(
        (cc) => cc.studentId === s.id && cc.clinicalCaseId === caseId && cc.status === "verified"
      ).length;
      return verifiedCount < clinicalCase.requiredCount;
    });
  }

  res.json(results);
});

router.get("/students/:id/passport", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = users.find((u) => u.id === id && u.role === "student");
  if (!user) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const activeCases = clinicalCases.filter((c) => c.isActive);
  const categories = [...new Set(activeCases.map((c) => c.category))];

  const categoryData = categories.map((cat) => {
    const catCases = activeCases.filter((c) => c.category === cat);
    const caseEntries = catCases.map((c) => {
      const submissions = caseCompletions.filter(
        (cc) => cc.studentId === id && cc.clinicalCaseId === c.id
      );
      const verified = submissions.filter((cc) => cc.status === "verified").length;
      const completed = submissions.length;
      const remaining = Math.max(0, c.requiredCount - verified);
      let status: "complete" | "in_progress" | "deficient" = "deficient";
      if (verified >= c.requiredCount) status = "complete";
      else if (completed > 0) status = "in_progress";

      return {
        caseId: c.id,
        caseName: c.name,
        category: c.category,
        required: c.requiredCount,
        completed,
        verified,
        remaining,
        status,
      };
    });

    const totalRequired = catCases.reduce((s, c) => s + c.requiredCount, 0);
    const totalVerified = caseEntries.reduce((s, e) => s + e.verified, 0);
    const completionRate = totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0;

    return { category: cat, completionRate, cases: caseEntries };
  });

  const totalRequired = activeCases.reduce((s, c) => s + c.requiredCount, 0);
  const totalVerified = caseCompletions
    .filter((cc) => cc.studentId === id && cc.status === "verified").length;
  const completedCases = caseCompletions
    .filter((cc) => cc.studentId === id && cc.status === "verified").length;

  res.json({
    studentId: id,
    totalCases: activeCases.length,
    completedCases,
    overallCompletion: totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0,
    categories: categoryData,
  });
});

router.get("/students/:id/attendance", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const records = attendance.filter((a) => a.studentId === id);
  res.json(records);
});

router.get("/students/:id/hours", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = users.find((u) => u.id === id && u.role === "student");
  if (!user) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const profile = studentProfiles.find((sp) => sp.userId === id);
  const totalHoursRequired = profile?.totalHoursRequired ?? 500;
  const totalHoursCompleted = getStudentHoursCompleted(id);
  const hoursRemaining = Math.max(0, totalHoursRequired - totalHoursCompleted);
  const progressPercent = Math.min(100, Math.round((totalHoursCompleted / totalHoursRequired) * 100));

  res.json({ studentId: id, totalHoursCompleted, totalHoursRequired, hoursRemaining, progressPercent });
});

export default router;
