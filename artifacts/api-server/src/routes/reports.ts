import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  studentProfilesTable,
  attendanceTable,
  schedulesTable,
  scheduleStudentsTable,
  hospitalsTable,
  departmentsTable,
  clinicalCasesTable,
  caseCompletionsTable,
} from "@workspace/db";
import { eq, and, gte, lte, count, sql, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Attendance Summary ─────────────────────────────────────────────────────────

async function buildAttendanceSummary(dateFrom: Date | null, dateTo: Date | null) {
  const conditions: ReturnType<typeof eq>[] = [];
  if (dateFrom) conditions.push(gte(schedulesTable.dutyDate, toDateStr(dateFrom)) as any);
  if (dateTo)   conditions.push(lte(schedulesTable.dutyDate, toDateStr(dateTo)) as any);

  const rows = await db
    .select({
      hospitalName: hospitalsTable.name,
      departmentName: departmentsTable.name,
      status: attendanceTable.status,
      cnt: count(attendanceTable.id),
    })
    .from(attendanceTable)
    .innerJoin(schedulesTable, eq(attendanceTable.scheduleId, schedulesTable.id))
    .innerJoin(hospitalsTable, eq(schedulesTable.hospitalId, hospitalsTable.id))
    .innerJoin(departmentsTable, eq(schedulesTable.departmentId, departmentsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(hospitalsTable.name, departmentsTable.name, attendanceTable.status);

  // pivot by status
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const key = `${r.hospitalName}|||${r.departmentName}`;
    if (!map.has(key)) map.set(key, { present: 0, late: 0, absent: 0, excused: 0 });
    map.get(key)![r.status ?? "absent"] = (map.get(key)![r.status ?? "absent"] ?? 0) + Number(r.cnt);
  }

  return [...map.entries()].map(([k, v]) => {
    const [hospital, department] = k.split("|||");
    const total = (v.present ?? 0) + (v.late ?? 0) + (v.absent ?? 0) + (v.excused ?? 0);
    const rate = total > 0 ? Math.round(((v.present + v.late) / total) * 100) : 0;
    return { hospital, department, present: v.present ?? 0, late: v.late ?? 0, absent: v.absent ?? 0, excused: v.excused ?? 0, total, attendanceRate: `${rate}%` };
  });
}

// ── Student Progress ───────────────────────────────────────────────────────────

async function buildStudentProgress(dateFrom: Date | null, dateTo: Date | null) {
  const students = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
              studentNumber: studentProfilesTable.studentNumber, yearLevel: studentProfilesTable.yearLevel, section: studentProfilesTable.section })
    .from(usersTable)
    .innerJoin(studentProfilesTable, eq(usersTable.id, studentProfilesTable.userId))
    .where(eq(usersTable.role, "student"));

  if (!students.length) return [];

  const ids = students.map(s => s.id);

  // Fetch schedules in range, then join students/attendance against those schedule IDs
  const schedConds: ReturnType<typeof eq>[] = [];
  if (dateFrom) schedConds.push(gte(schedulesTable.dutyDate, toDateStr(dateFrom)) as any);
  if (dateTo)   schedConds.push(lte(schedulesTable.dutyDate, toDateStr(dateTo)) as any);

  const rangeSchedules = schedConds.length
    ? await db.select({ id: schedulesTable.id }).from(schedulesTable).where(and(...schedConds))
    : await db.select({ id: schedulesTable.id }).from(schedulesTable);

  const rangeScheduleIds = rangeSchedules.map(s => s.id);

  if (!rangeScheduleIds.length) return students.map(s => ({
    name: `${s.firstName} ${s.lastName}`,
    studentNumber: s.studentNumber ?? "—",
    yearLevel: s.yearLevel ?? "—",
    section: s.section ?? "—",
    totalDuties: 0, attended: 0, attendanceRate: "0%",
  }));

  const [attendanceRows, scheduleRows] = await Promise.all([
    db.select({ studentId: attendanceTable.studentId, status: attendanceTable.status })
      .from(attendanceTable)
      .where(and(inArray(attendanceTable.studentId, ids), inArray(attendanceTable.scheduleId, rangeScheduleIds))),
    db.select({ studentId: scheduleStudentsTable.studentId })
      .from(scheduleStudentsTable)
      .where(and(inArray(scheduleStudentsTable.studentId, ids), inArray(scheduleStudentsTable.scheduleId, rangeScheduleIds))),
  ]);

  return students.map(s => {
    const sAttendance = attendanceRows.filter(a => a.studentId === s.id);
    const present = sAttendance.filter(a => a.status === "present" || a.status === "late").length;
    const total = scheduleRows.filter(r => r.studentId === s.id).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      name: `${s.firstName} ${s.lastName}`,
      studentNumber: s.studentNumber ?? "—",
      yearLevel: s.yearLevel ?? "—",
      section: s.section ?? "—",
      totalDuties: total,
      attended: present,
      attendanceRate: `${rate}%`,
    };
  });
}

// ── Case Compliance ────────────────────────────────────────────────────────────

async function buildCaseCompliance(dateFrom: Date | null, dateTo: Date | null) {
  const cases = await db.select().from(clinicalCasesTable).where(eq(clinicalCasesTable.isActive, true));
  if (!cases.length) return [];

  const completionConds: ReturnType<typeof eq>[] = [];
  if (dateFrom) completionConds.push(gte(caseCompletionsTable.submittedAt, dateFrom) as any);
  if (dateTo)   completionConds.push(lte(caseCompletionsTable.submittedAt, dateTo) as any);

  const completions = completionConds.length
    ? await db.select({ clinicalCaseId: caseCompletionsTable.clinicalCaseId, status: caseCompletionsTable.status })
        .from(caseCompletionsTable).where(and(...completionConds))
    : await db.select({ clinicalCaseId: caseCompletionsTable.clinicalCaseId, status: caseCompletionsTable.status })
        .from(caseCompletionsTable);

  const studentCount = await db
    .select({ cnt: count(usersTable.id) })
    .from(usersTable)
    .where(eq(usersTable.role, "student"))
    .then(r => Number(r[0]?.cnt ?? 0));

  return cases.map(c => {
    const cCompletions = completions.filter(cp => cp.clinicalCaseId === c.id);
    const verified = cCompletions.filter(cp => cp.status === "verified").length;
    const pending = cCompletions.filter(cp => cp.status === "pending").length;
    const gapCount = Math.max(0, studentCount - verified);
    const compliancePct = studentCount > 0 ? Math.round((verified / studentCount) * 100) : 0;
    return {
      caseName: c.name,
      category: c.category,
      requiredCount: c.requiredCount,
      verified,
      pending,
      gapCount,
      complianceRate: `${compliancePct}%`,
    };
  });
}

// ── CI Performance ─────────────────────────────────────────────────────────────

async function buildCIPerformance(dateFrom: Date | null, dateTo: Date | null) {
  const conds: ReturnType<typeof eq>[] = [eq(usersTable.role, "ci") as any];

  const ciUsers = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(eq(usersTable.role, "ci"));

  if (!ciUsers.length) return [];

  const schedConds: ReturnType<typeof eq>[] = [];
  if (dateFrom) schedConds.push(gte(schedulesTable.dutyDate, toDateStr(dateFrom)) as any);
  if (dateTo)   schedConds.push(lte(schedulesTable.dutyDate, toDateStr(dateTo)) as any);

  const scheds = schedConds.length
    ? await db.select().from(schedulesTable).where(and(...schedConds))
    : await db.select().from(schedulesTable);

  const ids = ciUsers.map(c => c.id);

  return ciUsers.map(ci => {
    const myScheds = scheds.filter(s => s.ciId === ci.id);
    const completed = myScheds.filter(s => s.status === "completed").length;
    const total = myScheds.length;
    return {
      name: `${ci.firstName} ${ci.lastName}`,
      totalSchedules: total,
      completed,
      upcoming: myScheds.filter(s => s.status === "upcoming").length,
      cancelled: myScheds.filter(s => s.status === "cancelled").length,
      completionRate: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%",
    };
  });
}

// ── Makeup Duty Status ─────────────────────────────────────────────────────────

async function buildMakeupDuty() {
  // Pull schedules marked as makeup-related (status completed/upcoming) with student count
  const scheds = await db
    .select({
      id: schedulesTable.id,
      title: schedulesTable.title,
      dutyDate: schedulesTable.dutyDate,
      status: schedulesTable.status,
      hospitalName: hospitalsTable.name,
    })
    .from(schedulesTable)
    .innerJoin(hospitalsTable, eq(schedulesTable.hospitalId, hospitalsTable.id));

  const studentCounts = await db
    .select({ scheduleId: scheduleStudentsTable.scheduleId, cnt: count(scheduleStudentsTable.studentId) })
    .from(scheduleStudentsTable)
    .groupBy(scheduleStudentsTable.scheduleId);

  const countMap = new Map(studentCounts.map(r => [r.scheduleId, Number(r.cnt)]));

  return scheds.map(s => ({
    title: s.title ?? "—",
    hospital: s.hospitalName,
    dutyDate: s.dutyDate,
    status: s.status,
    students: countMap.get(s.id) ?? 0,
  })).slice(0, 200);
}

// ── Completion Forecast ────────────────────────────────────────────────────────

async function buildCompletionForecast() {
  const students = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
              studentNumber: studentProfilesTable.studentNumber, yearLevel: studentProfilesTable.yearLevel, section: studentProfilesTable.section })
    .from(usersTable)
    .innerJoin(studentProfilesTable, eq(usersTable.id, studentProfilesTable.userId))
    .where(eq(usersTable.role, "student"));

  if (!students.length) return [];

  const ids = students.map(s => s.id);

  const scheduleRows = await db.select({ studentId: scheduleStudentsTable.studentId, scheduleId: scheduleStudentsTable.scheduleId })
    .from(scheduleStudentsTable)
    .where(inArray(scheduleStudentsTable.studentId, ids));

  const scheduleIds = [...new Set(scheduleRows.map(r => r.scheduleId))];
  const completedScheds = scheduleIds.length
    ? (await db.select({ id: schedulesTable.id }).from(schedulesTable).where(and(inArray(schedulesTable.id, scheduleIds), eq(schedulesTable.status, "completed"))))
    : [];
  const completedSet = new Set(completedScheds.map(s => s.id));

  return students.map(s => {
    const assigned = scheduleRows.filter(r => r.studentId === s.id);
    const completed = assigned.filter(r => completedSet.has(r.scheduleId)).length;
    const total = assigned.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const risk = pct < 50 ? "High Risk" : pct < 75 ? "At Risk" : "On Track";
    return {
      name: `${s.firstName} ${s.lastName}`,
      studentNumber: s.studentNumber ?? "—",
      yearLevel: s.yearLevel ?? "—",
      section: s.section ?? "—",
      totalDuties: total,
      completed,
      progressPct: `${pct}%`,
      status: risk,
    };
  });
}

// ── Data loader ───────────────────────────────────────────────────────────────

async function loadReportData(type: string, dateFrom: Date | null, dateTo: Date | null): Promise<{ title: string; columns: string[]; rows: Record<string, unknown>[] }> {
  switch (type) {
    case "attendance-summary": {
      const rows = await buildAttendanceSummary(dateFrom, dateTo);
      return { title: "Attendance Summary Report", columns: ["hospital","department","present","late","absent","excused","total","attendanceRate"], rows };
    }
    case "student-progress": {
      const rows = await buildStudentProgress(dateFrom, dateTo);
      return { title: "Student Progress Report", columns: ["name","studentNumber","yearLevel","section","totalDuties","attended","attendanceRate"], rows };
    }
    case "case-compliance": {
      const rows = await buildCaseCompliance(dateFrom, dateTo);
      return { title: "Case Compliance Report", columns: ["caseName","category","requiredCount","verified","pending","gapCount","complianceRate"], rows };
    }
    case "ci-performance": {
      const rows = await buildCIPerformance(dateFrom, dateTo);
      return { title: "Clinical Instructor Performance Report", columns: ["name","totalSchedules","completed","upcoming","cancelled","completionRate"], rows };
    }
    case "makeup-duty": {
      const rows = await buildMakeupDuty();
      return { title: "Makeup Duty Status Report", columns: ["title","hospital","dutyDate","status","students"], rows };
    }
    case "completion-forecast": {
      const rows = await buildCompletionForecast();
      return { title: "Program Completion Forecast", columns: ["name","studentNumber","yearLevel","section","totalDuties","completed","progressPct","status"], rows };
    }
    default: {
      const rows = await buildStudentProgress(dateFrom, dateTo);
      return { title: "Student Progress Report", columns: ["name","studentNumber","yearLevel","section","totalDuties","attended","attendanceRate"], rows };
    }
  }
}

// ── PDF builder ───────────────────────────────────────────────────────────────

function buildPDF(title: string, columns: string[], rows: Record<string, unknown>[], res: import("express").Response) {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "-")}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(9).font("Helvetica").fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1);

  if (rows.length === 0) {
    doc.fillColor("#333").text("No data available for the selected date range.", { align: "center" });
    doc.end();
    return;
  }

  // Compute column widths evenly
  const pageW = doc.page.width - 80;
  const colW = pageW / columns.length;

  // Header row
  doc.fillColor("#1e3a5f").rect(40, doc.y, pageW, 18).fill();
  const headerY = doc.y - 18;
  doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
  columns.forEach((col, i) => {
    const label = col.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    doc.text(label, 40 + i * colW + 3, headerY + 4, { width: colW - 6, ellipsis: true });
  });
  doc.y = headerY + 22;

  // Data rows
  rows.forEach((row, ri) => {
    if (doc.y > doc.page.height - 60) { doc.addPage(); }
    const rowY = doc.y;
    const bg = ri % 2 === 0 ? "#f9f9f9" : "#ffffff";
    doc.fillColor(bg).rect(40, rowY, pageW, 16).fill();
    doc.fillColor("#222").fontSize(7.5).font("Helvetica");
    columns.forEach((col, i) => {
      const val = String(row[col] ?? "—");
      doc.text(val, 40 + i * colW + 3, rowY + 3, { width: colW - 6, ellipsis: true });
    });
    doc.y = rowY + 18;
  });

  doc.end();
}

// ── Excel builder ─────────────────────────────────────────────────────────────

async function buildExcel(title: string, columns: string[], rows: Record<string, unknown>[], res: import("express").Response) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ClinicalFlow";
  const ws = wb.addWorksheet(title.slice(0, 31));

  // Header
  const headers = columns.map(c => c.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()));
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  ws.getRow(1).alignment = { vertical: "middle" };

  // Data
  rows.forEach(row => {
    ws.addRow(columns.map(c => row[c] ?? ""));
  });

  // Auto-width
  columns.forEach((_, i) => {
    const col = ws.getColumn(i + 1);
    let max = (headers[i] || "").length;
    rows.forEach(r => { const v = String(r[columns[i]] ?? ""); if (v.length > max) max = v.length; });
    col.width = Math.min(max + 2, 40);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "-")}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

// ── CSV builder ────────────────────────────────────────────────────────────────

function buildCSV(title: string, columns: string[], rows: Record<string, unknown>[], res: import("express").Response) {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(c => c.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())).map(escape).join(",");
  const body = rows.map(r => columns.map(c => escape(r[c])).join(",")).join("\n");
  const csv = `${header}\n${body}`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "-")}.csv"`);
  res.send(csv);
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.get("/reports/:type", requireRole("admin", "scheduler"), async (req, res): Promise<void> => {
  const { type } = req.params;
  const { format = "pdf", dateFrom, dateTo } = req.query as Record<string, string | undefined>;

  const validTypes = ["attendance-summary", "student-progress", "case-compliance", "ci-performance", "makeup-duty", "completion-forecast"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `Unknown report type. Valid types: ${validTypes.join(", ")}` });
    return;
  }

  const from = parseDate(dateFrom);
  const to = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;

  try {
    const { title, columns, rows } = await loadReportData(type, from, to);

    if (format === "xlsx") {
      await buildExcel(title, columns, rows, res);
    } else if (format === "csv") {
      buildCSV(title, columns, rows, res);
    } else {
      buildPDF(title, columns, rows, res);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  }
});

export default router;
