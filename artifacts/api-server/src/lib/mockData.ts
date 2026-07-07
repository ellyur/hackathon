// In-memory mock data store for ClinicalFlow
// Replace with real DB queries when database is connected

import { randomUUID } from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type Role = "admin" | "scheduler" | "ci" | "student";
export type ScheduleStatus = "upcoming" | "active" | "completed" | "cancelled";
export type AttendanceStatus = "present" | "late" | "absent" | "pending";
export type CaseStatus = "pending" | "verified" | "rejected";
export type SlotStatus = "open" | "closed" | "cancelled";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string; // "password123" for all mock users
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MockStudentProfile {
  id: string;
  userId: string;
  studentNumber: string;
  yearLevel: number;
  section: string;
  program: string;
  academicYear: string;
  totalHoursRequired: number;
  createdAt: string;
}

export interface MockCIProfile {
  id: string;
  userId: string;
  employeeId: string;
  specialization: string;
}

export interface MockHospital {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  latitude: number;
  longitude: number;
  attendanceRadius: number;
  isActive: boolean;
  createdAt: string;
}

export interface MockDepartment {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface MockClinicalCase {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface MockSchedule {
  id: string;
  title: string | null;
  hospitalId: string;
  departmentId: string;
  ciId: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
  gracePeriodMin: number;
  status: ScheduleStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  studentIds: string[];
}

export interface MockAttendance {
  id: string;
  scheduleId: string;
  studentId: string;
  ciId: string | null;
  timeIn: string | null;
  timeOut: string | null;
  dutyHours: number | null;
  status: AttendanceStatus;
  method: "biometric" | "ci_assisted" | "manual";
  studentLatitude: number | null;
  studentLongitude: number | null;
  gpsVerified: boolean;
  faceVerified: boolean;
  livenessVerified: boolean;
  remarks: string | null;
  needsMakeup: boolean;
  makeupCompleted: boolean;
  createdAt: string;
}

export interface MockCaseCompletion {
  id: string;
  studentId: string;
  clinicalCaseId: string;
  scheduleId: string;
  hospitalId: string;
  departmentId: string;
  submittedAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  status: CaseStatus;
  rejectionReason: string | null;
  notes: string | null;
  photoUrl: string | null;
}

export interface MockDutySlot {
  id: string;
  hospitalId: string;
  departmentId: string;
  ciId: string | null;
  dutyDate: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  isMakeup: boolean;
  description: string | null;
  status: SlotStatus;
  createdBy: string;
  createdAt: string;
}

export interface MockDutyApplication {
  id: string;
  slotId: string;
  studentId: string;
  appliedAt: string;
  status: ApplicationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntity: string | null;
  relatedId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface MockAnnouncement {
  id: string;
  title: string;
  body: string;
  targetRole: "all" | "student" | "ci" | "scheduler" | "admin";
  postedBy: string | null;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface MockAnnouncementRead {
  announcementId: string;
  userId: string;
  readAt: string;
}

export interface MockAuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string;
  createdAt: string;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

// User IDs
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

// Hospital IDs
const H1_ID = "h-001";
const H2_ID = "h-002";
const H3_ID = "h-003";

// Dept IDs
const D1_ID = "d-001"; // H1 Delivery Room
const D2_ID = "d-002"; // H1 ICU
const D3_ID = "d-003"; // H1 Pedia Ward
const D4_ID = "d-004"; // H2 OB Ward
const D5_ID = "d-005"; // H2 Med-Surg
const D6_ID = "d-006"; // H3 Emergency

// Case IDs
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

// Schedule IDs
const SCH1_ID = "sch-001";
const SCH2_ID = "sch-002";
const SCH3_ID = "sch-003";
const SCH4_ID = "sch-004";
const SCH5_ID = "sch-005";

export const users: MockUser[] = [
  {
    id: ADMIN_ID,
    email: "admin@clinicalflow.com",
    passwordHash: "password123",
    role: "admin",
    firstName: "Dr. Elena",
    lastName: "Reyes",
    phone: "+63-917-111-0001",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-01T08:00:00Z",
  },
  {
    id: SCHEDULER_ID,
    email: "scheduler@clinicalflow.com",
    passwordHash: "password123",
    role: "scheduler",
    firstName: "Maria",
    lastName: "Santos",
    phone: "+63-917-222-0002",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-02T08:00:00Z",
  },
  {
    id: CI1_ID,
    email: "ci@clinicalflow.com",
    passwordHash: "password123",
    role: "ci",
    firstName: "Ana",
    lastName: "Dela Cruz",
    phone: "+63-917-333-0003",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-03T08:00:00Z",
  },
  {
    id: CI2_ID,
    email: "ci2@clinicalflow.com",
    passwordHash: "password123",
    role: "ci",
    firstName: "Roberto",
    lastName: "Lim",
    phone: "+63-917-333-0004",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-03T09:00:00Z",
  },
  {
    id: S1_ID,
    email: "student@clinicalflow.com",
    passwordHash: "password123",
    role: "student",
    firstName: "Juan",
    lastName: "Cruz",
    phone: "+63-917-444-0001",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-05T08:00:00Z",
  },
  {
    id: S2_ID,
    email: "student2@clinicalflow.com",
    passwordHash: "password123",
    role: "student",
    firstName: "Lea",
    lastName: "Mendoza",
    phone: "+63-917-444-0002",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-05T08:00:00Z",
  },
  {
    id: S3_ID,
    email: "student3@clinicalflow.com",
    passwordHash: "password123",
    role: "student",
    firstName: "Carlo",
    lastName: "Tan",
    phone: "+63-917-444-0003",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-05T08:00:00Z",
  },
  {
    id: S4_ID,
    email: "student4@clinicalflow.com",
    passwordHash: "password123",
    role: "student",
    firstName: "Mae",
    lastName: "Flores",
    phone: "+63-917-444-0004",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-05T08:00:00Z",
  },
  {
    id: S5_ID,
    email: "student5@clinicalflow.com",
    passwordHash: "password123",
    role: "student",
    firstName: "Rico",
    lastName: "Garcia",
    phone: "+63-917-444-0005",
    avatarUrl: null,
    isActive: false,
    createdAt: "2024-08-05T08:00:00Z",
  },
  {
    id: S6_ID,
    email: "student6@clinicalflow.com",
    passwordHash: "password123",
    role: "student",
    firstName: "Diana",
    lastName: "Ramos",
    phone: "+63-917-444-0006",
    avatarUrl: null,
    isActive: true,
    createdAt: "2024-08-05T08:00:00Z",
  },
];

export const studentProfiles: MockStudentProfile[] = [
  { id: "sp-001", userId: S1_ID, studentNumber: "BSN-2024-001", yearLevel: 3, section: "A", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500, createdAt: "2024-08-05T08:00:00Z" },
  { id: "sp-002", userId: S2_ID, studentNumber: "BSN-2024-002", yearLevel: 3, section: "A", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500, createdAt: "2024-08-05T08:00:00Z" },
  { id: "sp-003", userId: S3_ID, studentNumber: "BSN-2024-003", yearLevel: 3, section: "B", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500, createdAt: "2024-08-05T08:00:00Z" },
  { id: "sp-004", userId: S4_ID, studentNumber: "BSN-2024-004", yearLevel: 2, section: "B", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500, createdAt: "2024-08-05T08:00:00Z" },
  { id: "sp-005", userId: S5_ID, studentNumber: "BSN-2024-005", yearLevel: 2, section: "C", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500, createdAt: "2024-08-05T08:00:00Z" },
  { id: "sp-006", userId: S6_ID, studentNumber: "BSN-2024-006", yearLevel: 4, section: "A", program: "BSN", academicYear: "2024-2025", totalHoursRequired: 500, createdAt: "2024-08-05T08:00:00Z" },
];

export const ciProfiles: MockCIProfile[] = [
  { id: "cip-001", userId: CI1_ID, employeeId: "CI-2024-001", specialization: "Obstetrics & Gynecology" },
  { id: "cip-002", userId: CI2_ID, employeeId: "CI-2024-002", specialization: "Pediatrics" },
];

export const hospitals: MockHospital[] = [
  { id: H1_ID, name: "Philippine General Hospital", address: "Taft Ave, Ermita, Manila", contactNumber: "+63-2-8554-8400", latitude: 14.5794, longitude: 120.9841, attendanceRadius: 150, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: H2_ID, name: "Jose Reyes Memorial Medical Center", address: "Rizal Ave, Sta. Cruz, Manila", contactNumber: "+63-2-8711-9491", latitude: 14.6035, longitude: 120.9831, attendanceRadius: 100, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: H3_ID, name: "Makati Medical Center", address: "Amorsolo St, Makati City", contactNumber: "+63-2-8888-8999", latitude: 14.5577, longitude: 121.0141, attendanceRadius: 120, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
];

export const departments: MockDepartment[] = [
  { id: D1_ID, hospitalId: H1_ID, name: "Delivery Room", code: "DR", isActive: true },
  { id: D2_ID, hospitalId: H1_ID, name: "Intensive Care Unit", code: "ICU", isActive: true },
  { id: D3_ID, hospitalId: H1_ID, name: "Pediatric Ward", code: "PEDIA", isActive: true },
  { id: D4_ID, hospitalId: H2_ID, name: "OB Ward", code: "OB", isActive: true },
  { id: D5_ID, hospitalId: H2_ID, name: "Medical-Surgical Ward", code: "MED-SURG", isActive: true },
  { id: D6_ID, hospitalId: H3_ID, name: "Emergency Room", code: "ER", isActive: true },
];

export const clinicalCases: MockClinicalCase[] = [
  { id: C1_ID, name: "Normal Spontaneous Delivery", description: "Assist in or observe a normal vaginal delivery", category: "OB", requiredCount: 5, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C2_ID, name: "Assisted Delivery", description: "Assist in forceps or vacuum-assisted delivery", category: "OB", requiredCount: 2, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C3_ID, name: "IV Catheter Insertion", description: "Peripheral IV catheter placement and care", category: "Med-Surg", requiredCount: 10, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C4_ID, name: "Medication Administration (Oral)", description: "Safe oral medication administration", category: "Med-Surg", requiredCount: 1, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C5_ID, name: "Medication Administration (IV)", description: "Intravenous medication preparation and administration", category: "Med-Surg", requiredCount: 10, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C6_ID, name: "Vital Signs Monitoring", description: "Complete vital signs assessment and documentation", category: "Med-Surg", requiredCount: 20, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C7_ID, name: "Pediatric Physical Assessment", description: "Head-to-toe assessment of a pediatric patient", category: "Pediatrics", requiredCount: 5, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C8_ID, name: "Neonatal Care", description: "Newborn assessment and routine care", category: "OB", requiredCount: 5, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C9_ID, name: "Urinary Catheterization", description: "Foley catheter insertion and care", category: "Med-Surg", requiredCount: 5, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C10_ID, name: "Blood Extraction / Venipuncture", description: "Peripheral venipuncture for blood specimen collection", category: "Med-Surg", requiredCount: 5, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C11_ID, name: "Wound Dressing Change", description: "Clean or sterile wound dressing procedure", category: "Med-Surg", requiredCount: 8, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
  { id: C12_ID, name: "Surgical Assistance", description: "Scrub or circulating role in operating room", category: "Surgery", requiredCount: 3, isActive: true, createdAt: "2024-08-01T08:00:00Z" },
];

export const schedules: MockSchedule[] = [
  { id: SCH1_ID, title: "OB Rotation - Delivery Room", hospitalId: H1_ID, departmentId: D1_ID, ciId: CI1_ID, dutyDate: "2025-07-08", startTime: "06:00", endTime: "14:00", gracePeriodMin: 15, status: "upcoming", notes: null, createdBy: SCHEDULER_ID, createdAt: "2025-07-01T10:00:00Z", updatedAt: "2025-07-01T10:00:00Z", studentIds: [S1_ID, S2_ID] },
  { id: SCH2_ID, title: "ICU Rotation", hospitalId: H1_ID, departmentId: D2_ID, ciId: CI1_ID, dutyDate: "2025-07-07", startTime: "07:00", endTime: "15:00", gracePeriodMin: 15, status: "active", notes: "Bring your stethoscope", createdBy: SCHEDULER_ID, createdAt: "2025-07-01T10:00:00Z", updatedAt: "2025-07-01T10:00:00Z", studentIds: [S3_ID, S4_ID] },
  { id: SCH3_ID, title: "Pedia Ward Rotation", hospitalId: H1_ID, departmentId: D3_ID, ciId: CI2_ID, dutyDate: "2025-07-06", startTime: "06:00", endTime: "14:00", gracePeriodMin: 15, status: "completed", notes: null, createdBy: SCHEDULER_ID, createdAt: "2025-06-25T10:00:00Z", updatedAt: "2025-07-06T15:00:00Z", studentIds: [S1_ID, S3_ID, S6_ID] },
  { id: SCH4_ID, title: "Med-Surg Rotation", hospitalId: H2_ID, departmentId: D5_ID, ciId: CI2_ID, dutyDate: "2025-07-10", startTime: "08:00", endTime: "16:00", gracePeriodMin: 15, status: "upcoming", notes: null, createdBy: SCHEDULER_ID, createdAt: "2025-07-02T10:00:00Z", updatedAt: "2025-07-02T10:00:00Z", studentIds: [S2_ID, S5_ID, S6_ID] },
  { id: SCH5_ID, title: "Emergency Room Rotation", hospitalId: H3_ID, departmentId: D6_ID, ciId: CI1_ID, dutyDate: "2025-07-05", startTime: "14:00", endTime: "22:00", gracePeriodMin: 15, status: "completed", notes: null, createdBy: SCHEDULER_ID, createdAt: "2025-06-28T10:00:00Z", updatedAt: "2025-07-05T22:30:00Z", studentIds: [S1_ID, S4_ID] },
];

export const attendance: MockAttendance[] = [
  { id: "att-001", scheduleId: SCH2_ID, studentId: S3_ID, ciId: CI1_ID, timeIn: "2025-07-07T07:05:00Z", timeOut: null, dutyHours: null, status: "present", method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: null, needsMakeup: false, makeupCompleted: false, createdAt: "2025-07-07T07:05:00Z" },
  { id: "att-002", scheduleId: SCH2_ID, studentId: S4_ID, ciId: CI1_ID, timeIn: "2025-07-07T07:22:00Z", timeOut: null, dutyHours: null, status: "late", method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: "Traffic", needsMakeup: false, makeupCompleted: false, createdAt: "2025-07-07T07:22:00Z" },
  { id: "att-003", scheduleId: SCH3_ID, studentId: S1_ID, ciId: CI2_ID, timeIn: "2025-07-06T06:03:00Z", timeOut: "2025-07-06T14:10:00Z", dutyHours: 8.12, status: "present", method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: null, needsMakeup: false, makeupCompleted: false, createdAt: "2025-07-06T06:03:00Z" },
  { id: "att-004", scheduleId: SCH3_ID, studentId: S3_ID, ciId: CI2_ID, timeIn: "2025-07-06T06:10:00Z", timeOut: "2025-07-06T14:05:00Z", dutyHours: 7.92, status: "present", method: "biometric", studentLatitude: 14.5794, studentLongitude: 120.9841, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: null, needsMakeup: false, makeupCompleted: false, createdAt: "2025-07-06T06:10:00Z" },
  { id: "att-005", scheduleId: SCH3_ID, studentId: S6_ID, ciId: CI2_ID, timeIn: null, timeOut: null, dutyHours: null, status: "absent", method: "manual", studentLatitude: null, studentLongitude: null, gpsVerified: false, faceVerified: false, livenessVerified: false, remarks: "No show", needsMakeup: true, makeupCompleted: false, createdAt: "2025-07-06T08:00:00Z" },
  { id: "att-006", scheduleId: SCH5_ID, studentId: S1_ID, ciId: CI1_ID, timeIn: "2025-07-05T14:02:00Z", timeOut: "2025-07-05T22:15:00Z", dutyHours: 8.22, status: "present", method: "biometric", studentLatitude: 14.5577, studentLongitude: 121.0141, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: null, needsMakeup: false, makeupCompleted: false, createdAt: "2025-07-05T14:02:00Z" },
  { id: "att-007", scheduleId: SCH5_ID, studentId: S4_ID, ciId: CI1_ID, timeIn: "2025-07-05T14:30:00Z", timeOut: "2025-07-05T22:10:00Z", dutyHours: 7.67, status: "late", method: "biometric", studentLatitude: 14.5577, studentLongitude: 121.0141, gpsVerified: true, faceVerified: true, livenessVerified: true, remarks: null, needsMakeup: false, makeupCompleted: false, createdAt: "2025-07-05T14:30:00Z" },
];

export const caseCompletions: MockCaseCompletion[] = [
  // S1 - Juan Cruz - verified cases
  { id: "cc-001", studentId: S1_ID, clinicalCaseId: C1_ID, scheduleId: SCH5_ID, hospitalId: H3_ID, departmentId: D6_ID, submittedAt: "2025-07-05T22:20:00Z", verifiedAt: "2025-07-06T10:00:00Z", verifiedBy: SCHEDULER_ID, status: "verified", rejectionReason: null, notes: "Observed NSD in delivery room", photoUrl: null },
  { id: "cc-002", studentId: S1_ID, clinicalCaseId: C3_ID, scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, submittedAt: "2025-07-06T14:15:00Z", verifiedAt: "2025-07-06T16:00:00Z", verifiedBy: SCHEDULER_ID, status: "verified", rejectionReason: null, notes: "3 IV insertions during shift", photoUrl: null },
  { id: "cc-003", studentId: S1_ID, clinicalCaseId: C6_ID, scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, submittedAt: "2025-07-06T14:16:00Z", verifiedAt: "2025-07-06T16:00:00Z", verifiedBy: SCHEDULER_ID, status: "verified", rejectionReason: null, notes: "Vital signs Q4H for 5 patients", photoUrl: null },
  { id: "cc-004", studentId: S1_ID, clinicalCaseId: C7_ID, scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, submittedAt: "2025-07-06T14:17:00Z", verifiedAt: null, verifiedBy: null, status: "pending", rejectionReason: null, notes: "Pediatric assessment for 2 patients", photoUrl: null },
  { id: "cc-005", studentId: S1_ID, clinicalCaseId: C10_ID, scheduleId: SCH5_ID, hospitalId: H3_ID, departmentId: D6_ID, submittedAt: "2025-07-05T22:21:00Z", verifiedAt: null, verifiedBy: null, status: "pending", rejectionReason: null, notes: "Blood extraction for 2 patients in ER", photoUrl: null },
  // S2 - Lea Mendoza
  { id: "cc-006", studentId: S2_ID, clinicalCaseId: C6_ID, scheduleId: SCH4_ID, hospitalId: H2_ID, departmentId: D5_ID, submittedAt: "2025-07-04T15:00:00Z", verifiedAt: "2025-07-05T09:00:00Z", verifiedBy: SCHEDULER_ID, status: "verified", rejectionReason: null, notes: null, photoUrl: null },
  { id: "cc-007", studentId: S2_ID, clinicalCaseId: C11_ID, scheduleId: SCH4_ID, hospitalId: H2_ID, departmentId: D5_ID, submittedAt: "2025-07-04T15:01:00Z", verifiedAt: null, verifiedBy: null, status: "rejected", rejectionReason: "Notes too vague, please resubmit with more detail", notes: "Wound dressing on post-op patient", photoUrl: null },
  // S3 - Carlo Tan
  { id: "cc-008", studentId: S3_ID, clinicalCaseId: C3_ID, scheduleId: SCH3_ID, hospitalId: H1_ID, departmentId: D3_ID, submittedAt: "2025-07-06T14:20:00Z", verifiedAt: "2025-07-07T09:00:00Z", verifiedBy: SCHEDULER_ID, status: "verified", rejectionReason: null, notes: null, photoUrl: null },
  { id: "cc-009", studentId: S3_ID, clinicalCaseId: C5_ID, scheduleId: SCH2_ID, hospitalId: H1_ID, departmentId: D2_ID, submittedAt: "2025-07-07T15:00:00Z", verifiedAt: null, verifiedBy: null, status: "pending", rejectionReason: null, notes: "IV meds for 3 ICU patients", photoUrl: null },
];

export const dutySlots: MockDutySlot[] = [
  { id: "slot-001", hospitalId: H1_ID, departmentId: D1_ID, ciId: CI1_ID, dutyDate: "2025-07-12", startTime: "06:00", endTime: "14:00", maxStudents: 3, isMakeup: false, description: "Additional exposure in Delivery Room — NSD cases expected", status: "open", createdBy: SCHEDULER_ID, createdAt: "2025-07-05T10:00:00Z" },
  { id: "slot-002", hospitalId: H2_ID, departmentId: D4_ID, ciId: CI1_ID, dutyDate: "2025-07-13", startTime: "14:00", endTime: "22:00", maxStudents: 2, isMakeup: true, description: "Make-up duty slot for students with absences", status: "open", createdBy: SCHEDULER_ID, createdAt: "2025-07-05T11:00:00Z" },
  { id: "slot-003", hospitalId: H3_ID, departmentId: D6_ID, ciId: CI2_ID, dutyDate: "2025-07-11", startTime: "08:00", endTime: "16:00", maxStudents: 4, isMakeup: false, description: "ER rotation — high case exposure", status: "open", createdBy: SCHEDULER_ID, createdAt: "2025-07-06T09:00:00Z" },
];

export const dutyApplications: MockDutyApplication[] = [
  { id: "app-001", slotId: "slot-001", studentId: S1_ID, appliedAt: "2025-07-05T12:00:00Z", status: "pending", reviewedBy: null, reviewedAt: null, notes: null },
  { id: "app-002", slotId: "slot-001", studentId: S3_ID, appliedAt: "2025-07-05T12:30:00Z", status: "pending", reviewedBy: null, reviewedAt: null, notes: null },
  { id: "app-003", slotId: "slot-002", studentId: S6_ID, appliedAt: "2025-07-06T08:00:00Z", status: "pending", reviewedBy: null, reviewedAt: null, notes: "Needs makeup - was absent July 6" },
];

export const notifications: MockNotification[] = [
  { id: "notif-001", userId: S1_ID, type: "schedule_created", title: "New Duty Scheduled", message: "You have been assigned to OB Rotation - Delivery Room on July 8, 2025", relatedEntity: "schedule", relatedId: SCH1_ID, isRead: false, readAt: null, createdAt: "2025-07-01T10:01:00Z" },
  { id: "notif-002", userId: S3_ID, type: "case_verified", title: "Case Submission Verified", message: "Your IV Catheter Insertion submission from July 6 has been verified by the Scheduler.", relatedEntity: "case_completion", relatedId: "cc-008", isRead: false, readAt: null, createdAt: "2025-07-07T09:01:00Z" },
  { id: "notif-003", userId: SCHEDULER_ID, type: "case_submitted", title: "New Case Submission", message: "Juan Cruz submitted a Pediatric Physical Assessment for verification.", relatedEntity: "case_completion", relatedId: "cc-004", isRead: false, readAt: null, createdAt: "2025-07-06T14:17:01Z" },
  { id: "notif-004", userId: SCHEDULER_ID, type: "absence_marked", title: "Student Marked Absent", message: "Diana Ramos has been marked ABSENT for Pedia Ward Rotation on July 6.", relatedEntity: "attendance", relatedId: "att-005", isRead: false, readAt: null, createdAt: "2025-07-06T08:01:00Z" },
  { id: "notif-005", userId: S6_ID, type: "marked_absent", title: "You Were Marked Absent", message: "You have been marked ABSENT for your July 6 duty (Pedia Ward). Please contact your Scheduler.", relatedEntity: "attendance", relatedId: "att-005", isRead: false, readAt: null, createdAt: "2025-07-06T08:02:00Z" },
  { id: "notif-006", userId: S2_ID, type: "case_rejected", title: "Case Submission Rejected", message: "Your Wound Dressing Change submission was rejected: Notes too vague, please resubmit with more detail.", relatedEntity: "case_completion", relatedId: "cc-007", isRead: true, readAt: "2025-07-06T10:00:00Z", createdAt: "2025-07-06T09:30:00Z" },
  { id: "notif-007", userId: S1_ID, type: "slot_available", title: "New Available Duty Slot", message: "A new Delivery Room slot is open on July 12. Tap to apply.", relatedEntity: "slot", relatedId: "slot-001", isRead: false, readAt: null, createdAt: "2025-07-05T10:01:00Z" },
  { id: "notif-008", userId: CI1_ID, type: "schedule_created", title: "New Duty Assigned", message: "You are assigned as Clinical Instructor for OB Rotation - Delivery Room on July 8.", relatedEntity: "schedule", relatedId: SCH1_ID, isRead: true, readAt: "2025-07-01T12:00:00Z", createdAt: "2025-07-01T10:01:00Z" },
];

export const announcements: MockAnnouncement[] = [
  { id: "ann-001", title: "Rotation Schedule for July 2025 Released", body: "The complete rotation schedule for July 2025 has been published. All students are advised to check their assigned duties and report to the clinical site at least 15 minutes before their start time. Strict biometric attendance verification will be enforced.", targetRole: "all", postedBy: SCHEDULER_ID, isPinned: true, expiresAt: null, createdAt: "2025-07-01T08:00:00Z" },
  { id: "ann-002", title: "Reminder: Case Submission Deadline", body: "All case submissions for duties completed in June must be submitted by July 10, 2025. Submissions after the deadline will not be credited for this rotation period.", targetRole: "student", postedBy: SCHEDULER_ID, isPinned: false, expiresAt: "2025-07-10T23:59:00Z", createdAt: "2025-07-03T09:00:00Z" },
  { id: "ann-003", title: "Orientation for New Clinical Instructors", body: "A brief orientation for ClinicalFlow will be held on July 9, 2025 at 2:00 PM in the Program Office. All CIs are required to attend to learn the biometric attendance verification process.", targetRole: "ci", postedBy: ADMIN_ID, isPinned: false, expiresAt: null, createdAt: "2025-07-04T10:00:00Z" },
];

export const announcementReads: MockAnnouncementRead[] = [
  { announcementId: "ann-001", userId: S1_ID, readAt: "2025-07-01T09:00:00Z" },
  { announcementId: "ann-001", userId: S2_ID, readAt: "2025-07-01T10:00:00Z" },
  { announcementId: "ann-002", userId: S1_ID, readAt: "2025-07-04T08:00:00Z" },
];

export const auditLogs: MockAuditLog[] = [
  { id: "audit-001", userId: SCHEDULER_ID, action: "case_verified", entityType: "case_completion", entityId: "cc-001", oldValue: { status: "pending" }, newValue: { status: "verified" }, ipAddress: "192.168.1.1", createdAt: "2025-07-06T10:00:00Z" },
  { id: "audit-002", userId: SCHEDULER_ID, action: "case_rejected", entityType: "case_completion", entityId: "cc-007", oldValue: { status: "pending" }, newValue: { status: "rejected", rejectionReason: "Notes too vague" }, ipAddress: "192.168.1.1", createdAt: "2025-07-06T09:30:00Z" },
  { id: "audit-003", userId: CI2_ID, action: "attendance_manual_override", entityType: "attendance", entityId: "att-005", oldValue: { status: "pending" }, newValue: { status: "absent" }, ipAddress: "192.168.1.2", createdAt: "2025-07-06T08:00:00Z" },
  { id: "audit-004", userId: SCHEDULER_ID, action: "schedule_created", entityType: "schedule", entityId: SCH1_ID, oldValue: null, newValue: { title: "OB Rotation - Delivery Room" }, ipAddress: "192.168.1.1", createdAt: "2025-07-01T10:00:00Z" },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function getUserById(id: string): MockUser | undefined {
  return users.find((u) => u.id === id);
}

export function getUserProfile(user: MockUser) {
  const studentProfile = studentProfiles.find((sp) => sp.userId === user.id) ?? null;
  const ciProfile = ciProfiles.find((cp) => cp.userId === user.id) ?? null;
  return { ...user, passwordHash: undefined, studentProfile, ciProfile };
}

export function getStudentHoursCompleted(studentId: string): number {
  return attendance
    .filter((a) => a.studentId === studentId && a.dutyHours != null)
    .reduce((sum, a) => sum + (a.dutyHours ?? 0), 0);
}

export function getStudentAttendanceRate(studentId: string): number {
  const records = attendance.filter((a) => a.studentId === studentId);
  if (records.length === 0) return 100;
  const present = records.filter((a) => a.status === "present" || a.status === "late").length;
  return Math.round((present / records.length) * 100);
}

export function getStudentAbsenceCount(studentId: string): number {
  return attendance.filter((a) => a.studentId === studentId && a.status === "absent").length;
}

export function getStudentLateCount(studentId: string): number {
  return attendance.filter((a) => a.studentId === studentId && a.status === "late").length;
}

export function getStudentCaseCompletionRate(studentId: string): number {
  const totalRequired = clinicalCases
    .filter((c) => c.isActive)
    .reduce((sum, c) => sum + c.requiredCount, 0);
  const verified = caseCompletions.filter(
    (cc) => cc.studentId === studentId && cc.status === "verified"
  ).length;
  return Math.round((verified / totalRequired) * 100);
}

export function buildStudentDetail(user: MockUser) {
  const profile = studentProfiles.find((sp) => sp.userId === user.id);
  const hoursCompleted = getStudentHoursCompleted(user.id);
  const attendanceRate = getStudentAttendanceRate(user.id);
  const absenceCount = getStudentAbsenceCount(user.id);
  const lateCount = getStudentLateCount(user.id);
  const caseCompletionRate = getStudentCaseCompletionRate(user.id);
  const needsMakeup = attendance.some((a) => a.studentId === user.id && a.needsMakeup && !a.makeupCompleted);
  const isAtRisk = absenceCount >= 2 || caseCompletionRate < 30 || hoursCompleted < 100;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    studentProfile: profile ?? null,
    totalHoursCompleted: Math.round(hoursCompleted * 100) / 100,
    totalHoursRequired: profile?.totalHoursRequired ?? 500,
    attendanceRate,
    caseCompletionRate,
    absenceCount,
    lateCount,
    needsMakeup,
    isAtRisk,
  };
}

export function buildScheduleResponse(sch: MockSchedule) {
  const hospital = hospitals.find((h) => h.id === sch.hospitalId) ?? null;
  const dept = departments.find((d) => d.id === sch.departmentId) ?? null;
  const ci = users.find((u) => u.id === sch.ciId) ?? null;
  const studentList = sch.studentIds.map((sid) => {
    const u = users.find((u) => u.id === sid);
    if (!u) return null;
    return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, isActive: u.isActive, avatarUrl: u.avatarUrl };
  }).filter(Boolean);

  return {
    id: sch.id,
    title: sch.title,
    hospitalId: sch.hospitalId,
    departmentId: sch.departmentId,
    ciId: sch.ciId,
    dutyDate: sch.dutyDate,
    startTime: sch.startTime,
    endTime: sch.endTime,
    gracePeriodMin: sch.gracePeriodMin,
    status: sch.status,
    notes: sch.notes,
    createdBy: sch.createdBy,
    createdAt: sch.createdAt,
    updatedAt: sch.updatedAt,
    hospital: hospital ? { id: hospital.id, name: hospital.name, address: hospital.address, latitude: hospital.latitude, longitude: hospital.longitude, attendanceRadius: hospital.attendanceRadius, isActive: hospital.isActive, contactNumber: hospital.contactNumber, createdAt: hospital.createdAt } : null,
    department: dept ? { id: dept.id, hospitalId: dept.hospitalId, name: dept.name, code: dept.code, isActive: dept.isActive } : null,
    ci: ci ? { id: ci.id, firstName: ci.firstName, lastName: ci.lastName, email: ci.email, role: ci.role, isActive: ci.isActive, avatarUrl: ci.avatarUrl } : null,
    students: studentList,
  };
}

export function buildAttendanceResponse(att: MockAttendance) {
  const student = users.find((u) => u.id === att.studentId);
  const schedule = schedules.find((s) => s.id === att.scheduleId);
  return {
    ...att,
    student: student ? { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, role: student.role, isActive: student.isActive, avatarUrl: student.avatarUrl } : null,
    schedule: schedule ? buildScheduleResponse(schedule) : null,
  };
}

export function buildCaseCompletionResponse(cc: MockCaseCompletion) {
  const clinicalCase = clinicalCases.find((c) => c.id === cc.clinicalCaseId);
  const student = users.find((u) => u.id === cc.studentId);
  const hospital = hospitals.find((h) => h.id === cc.hospitalId);
  const dept = departments.find((d) => d.id === cc.departmentId);
  return {
    ...cc,
    clinicalCase: clinicalCase ?? null,
    student: student ? { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, role: student.role, isActive: student.isActive, avatarUrl: student.avatarUrl } : null,
    hospital: hospital ? { id: hospital.id, name: hospital.name, address: hospital.address, isActive: hospital.isActive, createdAt: hospital.createdAt } : null,
    department: dept ? { id: dept.id, hospitalId: dept.hospitalId, name: dept.name, code: dept.code, isActive: dept.isActive } : null,
  };
}

export function buildSlotResponse(slot: MockDutySlot) {
  const hospital = hospitals.find((h) => h.id === slot.hospitalId);
  const dept = departments.find((d) => d.id === slot.departmentId);
  const ci = slot.ciId ? users.find((u) => u.id === slot.ciId) : null;
  const apps = dutyApplications.filter((a) => a.slotId === slot.id);
  return {
    ...slot,
    hospital: hospital ? { id: hospital.id, name: hospital.name, address: hospital.address, isActive: hospital.isActive, createdAt: hospital.createdAt } : null,
    department: dept ? { id: dept.id, hospitalId: dept.hospitalId, name: dept.name, code: dept.code, isActive: dept.isActive } : null,
    ci: ci ? { id: ci.id, firstName: ci.firstName, lastName: ci.lastName, email: ci.email, role: ci.role, isActive: ci.isActive, avatarUrl: ci.avatarUrl } : null,
    applicationsCount: apps.length,
    approvedCount: apps.filter((a) => a.status === "approved").length,
  };
}

export function buildApplicationResponse(app: MockDutyApplication) {
  const student = users.find((u) => u.id === app.studentId);
  const slot = dutySlots.find((s) => s.id === app.slotId);
  return {
    ...app,
    student: student ? { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, role: student.role, isActive: student.isActive, avatarUrl: student.avatarUrl } : null,
    slot: slot ? buildSlotResponse(slot) : null,
  };
}

export { randomUUID };
