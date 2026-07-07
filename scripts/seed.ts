/**
 * Database seed script — inserts all reference data.
 * Run with: pnpm --filter @workspace/scripts run seed
 * Safe to re-run: uses onConflictDoNothing everywhere.
 */
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  ciProfilesTable,
  hospitalsTable,
  departmentsTable,
  clinicalCasesTable,
  schedulesTable,
  scheduleStudentsTable,
  attendanceTable,
  caseCompletionsTable,
  dutySlotsTable,
  dutyApplicationsTable,
  notificationsTable,
  announcementsTable,
  announcementReadsTable,
  auditLogsTable,
} from "@workspace/db";
import bcrypt from "bcrypt";

const HASH = await bcrypt.hash("password123", 10);

// ── IDs (match the mock data so client code stays consistent) ─────────────────
const ADMIN_ID = "u-admin-001";
const SCHEDULER_ID = "u-scheduler-001";
const CI1_ID = "u-ci-001";
const CI2_ID = "u-ci-002";
const S1_ID = "u-student-001";
const S2_ID = "u-student-002";
const S3_ID = "u-student-003";
const S4_ID = "u-student-004";
const S5_ID = "u-student-005";
const S6_ID = "u-student-006";
const H1_ID = "h-001";
const H2_ID = "h-002";
const H3_ID = "h-003";
const D1_ID = "d-001";
const D2_ID = "d-002";
const D3_ID = "d-003";
const D4_ID = "d-004";
const D5_ID = "d-005";
const D6_ID = "d-006";
const C1_ID = "c-001";
const C2_ID = "c-002";
const C3_ID = "c-003";
const C4_ID = "c-004";
const C5_ID = "c-005";
const C6_ID = "c-006";
const C7_ID = "c-007";
const C8_ID = "c-008";
const C9_ID = "c-009";
const C10_ID = "c-010";
const C11_ID = "c-011";
const C12_ID = "c-012";
const SCH1_ID = "sch-001";
const SCH2_ID = "sch-002";
const SCH3_ID = "sch-003";
const SCH4_ID = "sch-004";
const SCH5_ID = "sch-005";

console.log("🌱 Seeding database…");

// ── Users ──────────────────────────────────────────────────────────────────────
await db.insert(usersTable).values([
  { id: ADMIN_ID,     email: "admin@clinicalflow.com",     passwordHash: HASH, role: "admin",     firstName: "Dr. Elena", lastName: "Reyes",     phone: "+63-917-111-0001", isActive: true },
  { id: SCHEDULER_ID, email: "scheduler@clinicalflow.com", passwordHash: HASH, role: "scheduler", firstName: "Maria",    lastName: "Santos",    phone: "+63-917-222-0002", isActive: true },
  { id: CI1_ID,       email: "ci@clinicalflow.com",        passwordHash: HASH, role: "ci",        firstName: "Ana",      lastName: "Dela Cruz", phone: "+63-917-333-0003", isActive: true },
  { id: CI2_ID,       email: "ci2@clinicalflow.com",       passwordHash: HASH, role: "ci",        firstName: "Roberto",  lastName: "Lim",       phone: "+63-917-333-0004", isActive: true },
  { id: S1_ID,        email: "student@clinicalflow.com",   passwordHash: HASH, role: "student",   firstName: "Juan",     lastName: "Cruz",      phone: "+63-917-444-0001", isActive: true },
  { id: S2_ID,        email: "student2@clinicalflow.com",  passwordHash: HASH, role: "student",   firstName: "Lea",      lastName: "Mendoza",   phone: "+63-917-444-0002", isActive: true },
  { id: S3_ID,        email: "student3@clinicalflow.com",  passwordHash: HASH, role: "student",   firstName: "Carlo",    lastName: "Tan",       phone: "+63-917-444-0003", isActive: true },
  { id: S4_ID,        email: "student4@clinicalflow.com",  passwordHash: HASH, role: "student",   firstName: "Mae",      lastName: "Flores",    phone: "+63-917-444-0004", isActive: true },
  { id: S5_ID,        email: "student5@clinicalflow.com",  passwordHash: HASH, role: "student",   firstName: "Rico",     lastName: "Garcia",    phone: "+63-917-444-0005", isActive: false },
  { id: S6_ID,        email: "student6@clinicalflow.com",  passwordHash: HASH, role: "student",   firstName: "Diana",    lastName: "Ramos",     phone: "+63-917-444-0006", isActive: true },
]).onConflictDoUpdate({
  target: usersTable.id,
  set: { passwordHash: HASH }, // always refresh hash (rounds may have changed)
});
console.log("  ✓ users");

// ── Student profiles ───────────────────────────────────────────────────────────
await db.insert(studentProfilesTable).values([
  { id: "sp-001", userId: S1_ID, studentNumber: "BSN-2024-001", yearLevel: 3, section: "A", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500 },
  { id: "sp-002", userId: S2_ID, studentNumber: "BSN-2024-002", yearLevel: 3, section: "A", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500 },
  { id: "sp-003", userId: S3_ID, studentNumber: "BSN-2024-003", yearLevel: 3, section: "B", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500 },
  { id: "sp-004", userId: S4_ID, studentNumber: "BSN-2024-004", yearLevel: 2, section: "B", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500 },
  { id: "sp-005", userId: S5_ID, studentNumber: "BSN-2024-005", yearLevel: 2, section: "C", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500 },
  { id: "sp-006", userId: S6_ID, studentNumber: "BSN-2024-006", yearLevel: 4, section: "A", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500 },
]).onConflictDoNothing();
console.log("  ✓ student_profiles");

// ── CI profiles ────────────────────────────────────────────────────────────────
await db.insert(ciProfilesTable).values([
  { id: "cip-001", userId: CI1_ID, employeeId: "CI-2024-001", specialization: "Obstetrics & Gynecology" },
  { id: "cip-002", userId: CI2_ID, employeeId: "CI-2024-002", specialization: "Pediatrics" },
]).onConflictDoNothing();
console.log("  ✓ ci_profiles");

// ── Hospitals ──────────────────────────────────────────────────────────────────
await db.insert(hospitalsTable).values([
  { id: H1_ID, name: "Philippine General Hospital",        address: "Taft Ave, Ermita, Manila",           contactNumber: "+63-2-8554-8400", latitude: 14.5794, longitude: 120.9841, attendanceRadius: 150, isActive: true },
  { id: H2_ID, name: "Jose Reyes Memorial Medical Center", address: "Rizal Ave, Sta. Cruz, Manila",        contactNumber: "+63-2-8711-9491", latitude: 14.6035, longitude: 120.9831, attendanceRadius: 100, isActive: true },
  { id: H3_ID, name: "Makati Medical Center",              address: "Amorsolo St, Makati City",            contactNumber: "+63-2-8888-8999", latitude: 14.5577, longitude: 121.0141, attendanceRadius: 120, isActive: true },
]).onConflictDoNothing();
console.log("  ✓ hospitals");

// ── Departments ────────────────────────────────────────────────────────────────
await db.insert(departmentsTable).values([
  { id: D1_ID, hospitalId: H1_ID, name: "Delivery Room",         code: "DR",       isActive: true },
  { id: D2_ID, hospitalId: H1_ID, name: "Intensive Care Unit",   code: "ICU",      isActive: true },
  { id: D3_ID, hospitalId: H1_ID, name: "Pediatric Ward",        code: "PEDIA",    isActive: true },
  { id: D4_ID, hospitalId: H2_ID, name: "OB Ward",               code: "OB",       isActive: true },
  { id: D5_ID, hospitalId: H2_ID, name: "Medical-Surgical Ward", code: "MED-SURG", isActive: true },
  { id: D6_ID, hospitalId: H3_ID, name: "Emergency Room",        code: "ER",       isActive: true },
]).onConflictDoNothing();
console.log("  ✓ departments");

// ── Clinical cases ─────────────────────────────────────────────────────────────
await db.insert(clinicalCasesTable).values([
  { id: C1_ID,  name: "Normal Spontaneous Delivery",      description: "Assist in or observe a normal vaginal delivery",              category: "OB",       requiredCount: 5,  isActive: true },
  { id: C2_ID,  name: "Assisted Delivery",                description: "Assist in forceps or vacuum-assisted delivery",               category: "OB",       requiredCount: 2,  isActive: true },
  { id: C3_ID,  name: "IV Catheter Insertion",            description: "Peripheral IV catheter placement and care",                    category: "Med-Surg", requiredCount: 10, isActive: true },
  { id: C4_ID,  name: "Medication Administration (Oral)", description: "Safe oral medication administration",                         category: "Med-Surg", requiredCount: 1,  isActive: true },
  { id: C5_ID,  name: "Medication Administration (IV)",   description: "Intravenous medication preparation and administration",        category: "Med-Surg", requiredCount: 10, isActive: true },
  { id: C6_ID,  name: "Vital Signs Monitoring",           description: "Complete vital signs assessment and documentation",            category: "Med-Surg", requiredCount: 20, isActive: true },
  { id: C7_ID,  name: "Pediatric Physical Assessment",    description: "Head-to-toe assessment of a pediatric patient",               category: "Pediatrics",requiredCount: 5,  isActive: true },
  { id: C8_ID,  name: "Neonatal Care",                    description: "Newborn assessment and routine care",                         category: "OB",       requiredCount: 5,  isActive: true },
  { id: C9_ID,  name: "Urinary Catheterization",          description: "Foley catheter insertion and care",                           category: "Med-Surg", requiredCount: 5,  isActive: true },
  { id: C10_ID, name: "Blood Extraction / Venipuncture",  description: "Peripheral venipuncture for blood specimen collection",        category: "Med-Surg", requiredCount: 5,  isActive: true },
  { id: C11_ID, name: "Wound Dressing Change",            description: "Clean or sterile wound dressing procedure",                   category: "Med-Surg", requiredCount: 8,  isActive: true },
  { id: C12_ID, name: "Surgical Assistance",              description: "Scrub or circulating role in operating room",                 category: "Surgery",  requiredCount: 3,  isActive: true },
]).onConflictDoNothing();
console.log("  ✓ clinical_cases");

// ── Schedules ──────────────────────────────────────────────────────────────────
await db.insert(schedulesTable).values([
  { id: SCH1_ID, title: "OB Rotation - Delivery Room", hospitalId: H1_ID, departmentId: D1_ID, ciId: CI1_ID, dutyDate: "2025-07-08", startTime: "06:00", endTime: "14:00", gracePeriodMin: 15, status: "upcoming", createdBy: SCHEDULER_ID },
  { id: SCH2_ID, title: "ICU Rotation",                hospitalId: H1_ID, departmentId: D2_ID, ciId: CI1_ID, dutyDate: "2025-07-07", startTime: "07:00", endTime: "15:00", gracePeriodMin: 15, status: "active",   notes: "Bring your stethoscope", createdBy: SCHEDULER_ID },
  { id: SCH3_ID, title: "Pedia Ward Rotation",         hospitalId: H1_ID, departmentId: D3_ID, ciId: CI2_ID, dutyDate: "2025-07-06", startTime: "06:00", endTime: "14:00", gracePeriodMin: 15, status: "completed",createdBy: SCHEDULER_ID },
  { id: SCH4_ID, title: "Med-Surg Rotation",           hospitalId: H2_ID, departmentId: D5_ID, ciId: CI2_ID, dutyDate: "2025-07-10", startTime: "08:00", endTime: "16:00", gracePeriodMin: 15, status: "upcoming", createdBy: SCHEDULER_ID },
  { id: SCH5_ID, title: "Emergency Room Rotation",     hospitalId: H3_ID, departmentId: D6_ID, ciId: CI1_ID, dutyDate: "2025-07-05", startTime: "14:00", endTime: "22:00", gracePeriodMin: 15, status: "completed",createdBy: SCHEDULER_ID },
]).onConflictDoNothing();
console.log("  ✓ schedules");

// ── Schedule students ──────────────────────────────────────────────────────────
await db.insert(scheduleStudentsTable).values([
  { scheduleId: SCH1_ID, studentId: S1_ID },
  { scheduleId: SCH1_ID, studentId: S2_ID },
  { scheduleId: SCH2_ID, studentId: S3_ID },
  { scheduleId: SCH2_ID, studentId: S4_ID },
  { scheduleId: SCH3_ID, studentId: S1_ID },
  { scheduleId: SCH3_ID, studentId: S3_ID },
  { scheduleId: SCH3_ID, studentId: S6_ID },
  { scheduleId: SCH4_ID, studentId: S2_ID },
  { scheduleId: SCH4_ID, studentId: S5_ID },
  { scheduleId: SCH4_ID, studentId: S6_ID },
  { scheduleId: SCH5_ID, studentId: S1_ID },
  { scheduleId: SCH5_ID, studentId: S4_ID },
]).onConflictDoNothing();
console.log("  ✓ schedule_students");

// ── Attendance ─────────────────────────────────────────────────────────────────
await db.insert(attendanceTable).values([
  { id: "att-001", scheduleId: SCH2_ID, studentId: S3_ID, ciId: CI1_ID, timeIn: new Date("2025-07-07T07:05:00Z"), status: "present",  method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true },
  { id: "att-002", scheduleId: SCH2_ID, studentId: S4_ID, ciId: CI1_ID, timeIn: new Date("2025-07-07T07:22:00Z"), status: "late",     method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: "Traffic" },
  { id: "att-003", scheduleId: SCH3_ID, studentId: S1_ID, ciId: CI2_ID, timeIn: new Date("2025-07-06T06:03:00Z"), timeOut: new Date("2025-07-06T14:10:00Z"), dutyHours: 8.12, status: "present",  method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true },
  { id: "att-004", scheduleId: SCH3_ID, studentId: S3_ID, ciId: CI2_ID, timeIn: new Date("2025-07-06T06:10:00Z"), timeOut: new Date("2025-07-06T14:05:00Z"), dutyHours: 7.92, status: "present",  method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true },
  { id: "att-005", scheduleId: SCH3_ID, studentId: S6_ID, ciId: CI2_ID, status: "absent",  method: "manual", gpsVerified: false, faceVerified: false, livenessVerified: false, remarks: "No show", needsMakeup: true },
  { id: "att-006", scheduleId: SCH5_ID, studentId: S1_ID, ciId: CI1_ID, timeIn: new Date("2025-07-05T14:02:00Z"), timeOut: new Date("2025-07-05T22:15:00Z"), dutyHours: 8.22, status: "present",  method: "biometric", studentLatitude: 14.5577, studentLongitude: 121.0141, gpsVerified: true, faceVerified: true, livenessVerified: true },
  { id: "att-007", scheduleId: SCH5_ID, studentId: S4_ID, ciId: CI1_ID, timeIn: new Date("2025-07-05T14:30:00Z"), timeOut: new Date("2025-07-05T22:10:00Z"), dutyHours: 7.67, status: "late",     method: "biometric", studentLatitude: 14.5577, studentLongitude: 121.0141, gpsVerified: true, faceVerified: true, livenessVerified: true },
]).onConflictDoNothing();
console.log("  ✓ attendance");

// ── Case completions ───────────────────────────────────────────────────────────
await db.insert(caseCompletionsTable).values([
  { id: "cc-001", studentId: S1_ID, clinicalCaseId: C1_ID,  scheduleId: SCH5_ID, hospitalId: H3_ID, departmentId: D6_ID, verifiedAt: new Date("2025-07-06T10:00:00Z"), verifiedBy: SCHEDULER_ID, status: "verified", notes: "Observed NSD in delivery room" },
  { id: "cc-002", studentId: S1_ID, clinicalCaseId: C3_ID,  scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, verifiedAt: new Date("2025-07-06T16:00:00Z"), verifiedBy: SCHEDULER_ID, status: "verified", notes: "3 IV insertions during shift" },
  { id: "cc-003", studentId: S1_ID, clinicalCaseId: C6_ID,  scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, verifiedAt: new Date("2025-07-06T16:00:00Z"), verifiedBy: SCHEDULER_ID, status: "verified", notes: "Vital signs Q4H for 5 patients" },
  { id: "cc-004", studentId: S1_ID, clinicalCaseId: C7_ID,  scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, status: "pending", notes: "Pediatric assessment for 2 patients" },
  { id: "cc-005", studentId: S1_ID, clinicalCaseId: C10_ID, scheduleId: SCH5_ID, hospitalId: H3_ID, departmentId: D6_ID, status: "pending", notes: "Blood extraction for 2 patients in ER" },
  { id: "cc-006", studentId: S2_ID, clinicalCaseId: C6_ID,  scheduleId: SCH4_ID, hospitalId: H2_ID, departmentId: D5_ID, verifiedAt: new Date("2025-07-05T09:00:00Z"), verifiedBy: SCHEDULER_ID, status: "verified" },
  { id: "cc-007", studentId: S2_ID, clinicalCaseId: C11_ID, scheduleId: SCH4_ID, hospitalId: H2_ID, departmentId: D5_ID, status: "rejected", rejectionReason: "Notes too vague, please resubmit with more detail", notes: "Wound dressing on post-op patient" },
  { id: "cc-008", studentId: S3_ID, clinicalCaseId: C3_ID,  scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, verifiedAt: new Date("2025-07-07T09:00:00Z"), verifiedBy: SCHEDULER_ID, status: "verified" },
  { id: "cc-009", studentId: S3_ID, clinicalCaseId: C5_ID,  scheduleId: SCH2_ID, hospitalId: H1_ID, departmentId: D2_ID, status: "pending", notes: "IV meds for 3 ICU patients" },
]).onConflictDoNothing();
console.log("  ✓ case_completions");

// ── Duty slots ─────────────────────────────────────────────────────────────────
await db.insert(dutySlotsTable).values([
  { id: "slot-001", hospitalId: H1_ID, departmentId: D1_ID, ciId: CI1_ID, dutyDate: "2025-07-12", startTime: "06:00", endTime: "14:00", maxStudents: 3, isMakeup: false, description: "Additional exposure in Delivery Room — NSD cases expected", status: "open", createdBy: SCHEDULER_ID },
  { id: "slot-002", hospitalId: H2_ID, departmentId: D4_ID, ciId: CI1_ID, dutyDate: "2025-07-13", startTime: "14:00", endTime: "22:00", maxStudents: 2, isMakeup: true,  description: "Make-up duty slot for students with absences", status: "open", createdBy: SCHEDULER_ID },
  { id: "slot-003", hospitalId: H3_ID, departmentId: D6_ID, ciId: CI2_ID, dutyDate: "2025-07-11", startTime: "08:00", endTime: "16:00", maxStudents: 4, isMakeup: false, description: "ER rotation — high case exposure", status: "open", createdBy: SCHEDULER_ID },
]).onConflictDoNothing();
console.log("  ✓ duty_slots");

// ── Duty applications ──────────────────────────────────────────────────────────
await db.insert(dutyApplicationsTable).values([
  { id: "app-001", slotId: "slot-001", studentId: S1_ID, status: "pending" },
  { id: "app-002", slotId: "slot-001", studentId: S3_ID, status: "pending" },
  { id: "app-003", slotId: "slot-002", studentId: S6_ID, status: "pending", notes: "Needs makeup - was absent July 6" },
]).onConflictDoNothing();
console.log("  ✓ duty_applications");

// ── Notifications ──────────────────────────────────────────────────────────────
await db.insert(notificationsTable).values([
  { id: "notif-001", userId: S1_ID,       type: "schedule_created", title: "New Duty Scheduled",          message: "You have been assigned to OB Rotation - Delivery Room on July 8, 2025",          relatedEntity: "schedule",         relatedId: SCH1_ID, isRead: false },
  { id: "notif-002", userId: S3_ID,       type: "case_verified",    title: "Case Submission Verified",    message: "Your IV Catheter Insertion submission from July 6 has been verified.",            relatedEntity: "case_completion",  relatedId: "cc-008", isRead: false },
  { id: "notif-003", userId: SCHEDULER_ID,type: "case_submitted",   title: "New Case Submission",         message: "Juan Cruz submitted a Pediatric Physical Assessment for verification.",           relatedEntity: "case_completion",  relatedId: "cc-004", isRead: false },
  { id: "notif-004", userId: SCHEDULER_ID,type: "absence_marked",   title: "Student Marked Absent",       message: "Diana Ramos has been marked ABSENT for Pedia Ward Rotation on July 6.",          relatedEntity: "attendance",       relatedId: "att-005", isRead: false },
  { id: "notif-005", userId: S6_ID,       type: "marked_absent",    title: "You Were Marked Absent",      message: "You have been marked ABSENT for your July 6 duty. Please contact your Scheduler.",relatedEntity: "attendance",       relatedId: "att-005", isRead: false },
  { id: "notif-006", userId: S2_ID,       type: "case_rejected",    title: "Case Submission Rejected",    message: "Your Wound Dressing Change submission was rejected: Notes too vague.",            relatedEntity: "case_completion",  relatedId: "cc-007", isRead: true,  readAt: new Date("2025-07-06T10:00:00Z") },
  { id: "notif-007", userId: S1_ID,       type: "slot_available",   title: "New Available Duty Slot",     message: "A new Delivery Room slot is open on July 12. Tap to apply.",                     relatedEntity: "slot",             relatedId: "slot-001", isRead: false },
  { id: "notif-008", userId: CI1_ID,      type: "schedule_created", title: "New Duty Assigned",           message: "You are assigned as Clinical Instructor for OB Rotation on July 8.",             relatedEntity: "schedule",         relatedId: SCH1_ID, isRead: true,  readAt: new Date("2025-07-01T12:00:00Z") },
]).onConflictDoNothing();
console.log("  ✓ notifications");

// ── Announcements ──────────────────────────────────────────────────────────────
await db.insert(announcementsTable).values([
  { id: "ann-001", title: "Rotation Schedule for July 2025 Released",   body: "The complete rotation schedule for July 2025 has been published. All students are advised to check their assigned duties and report to the clinical site at least 15 minutes before their start time.", targetRole: "all",     postedBy: SCHEDULER_ID, isPinned: true  },
  { id: "ann-002", title: "Reminder: Case Submission Deadline",          body: "All case submissions for duties completed in June must be submitted by July 10, 2025. Submissions after the deadline will not be credited for this rotation period.",                                 targetRole: "student", postedBy: SCHEDULER_ID, expiresAt: new Date("2025-07-10T23:59:00Z") },
  { id: "ann-003", title: "Orientation for New Clinical Instructors",    body: "A brief orientation for ClinicalFlow will be held on July 9, 2025 at 2:00 PM in the Program Office. All CIs are required to attend to learn the biometric attendance verification process.",       targetRole: "ci",     postedBy: ADMIN_ID },
]).onConflictDoNothing();
console.log("  ✓ announcements");

await db.insert(announcementReadsTable).values([
  { announcementId: "ann-001", userId: S1_ID },
  { announcementId: "ann-001", userId: S2_ID },
  { announcementId: "ann-002", userId: S1_ID },
]).onConflictDoNothing();
console.log("  ✓ announcement_reads");

// ── Audit logs ─────────────────────────────────────────────────────────────────
await db.insert(auditLogsTable).values([
  { id: "audit-001", userId: SCHEDULER_ID, action: "case_verified",              entityType: "case_completion", entityId: "cc-001",    oldValue: { status: "pending" }, newValue: { status: "verified" },                                     ipAddress: "127.0.0.1" },
  { id: "audit-002", userId: SCHEDULER_ID, action: "case_rejected",              entityType: "case_completion", entityId: "cc-007",    oldValue: { status: "pending" }, newValue: { status: "rejected", rejectionReason: "Notes too vague" }, ipAddress: "127.0.0.1" },
  { id: "audit-003", userId: CI2_ID,       action: "attendance_manual_override", entityType: "attendance",      entityId: "att-005",   oldValue: { status: "pending" }, newValue: { status: "absent" },                                      ipAddress: "127.0.0.1" },
  { id: "audit-004", userId: SCHEDULER_ID, action: "schedule_created",           entityType: "schedule",        entityId: SCH1_ID,     oldValue: null,                  newValue: { title: "OB Rotation - Delivery Room" },                  ipAddress: "127.0.0.1" },
]).onConflictDoNothing();
console.log("  ✓ audit_logs");

console.log("\n✅ Seed complete!");
console.log("\nTest accounts (password: password123):");
console.log("  admin@clinicalflow.com    → Admin");
console.log("  scheduler@clinicalflow.com → Scheduler");
console.log("  ci@clinicalflow.com       → Clinical Instructor");
console.log("  student@clinicalflow.com  → Student");

process.exit(0);
