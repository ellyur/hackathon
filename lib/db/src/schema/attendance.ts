import { pgTable, text, boolean, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { schedulesTable } from "./schedules";

export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "late", "absent", "pending"]);
export const attendanceMethodEnum = pgEnum("attendance_method", ["biometric", "ci_assisted", "manual"]);

export const attendanceTable = pgTable("attendance", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedulesTable.id),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  ciId: text("ci_id").references(() => usersTable.id),
  timeIn: timestamp("time_in", { withTimezone: true }),
  timeOut: timestamp("time_out", { withTimezone: true }),
  dutyHours: real("duty_hours"),
  status: attendanceStatusEnum("status").notNull().default("pending"),
  method: attendanceMethodEnum("method").notNull().default("biometric"),
  studentLatitude: real("student_latitude"),
  studentLongitude: real("student_longitude"),
  gpsVerified: boolean("gps_verified").notNull().default(false),
  faceVerified: boolean("face_verified").notNull().default(false),
  livenessVerified: boolean("liveness_verified").notNull().default(false),
  remarks: text("remarks"),
  needsMakeup: boolean("needs_makeup").notNull().default(false),
  makeupCompleted: boolean("makeup_completed").notNull().default(false),
  // Buddy attendance fields
  verifiedByStudentId: text("verified_by_student_id").references(() => usersTable.id),
  isBuddyAttendance: boolean("is_buddy_attendance").notNull().default(false),
  deviceId: text("device_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Attendance = typeof attendanceTable.$inferSelect;
