import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { schedulesTable } from "./schedules";
import { attendanceTable } from "./attendance";
import { hospitalsTable, departmentsTable } from "./hospitals";
import { clinicalCasesTable } from "./cases";

export const dutyVerificationStatusEnum = pgEnum("duty_verification_status", [
  "waiting_ci",
  "ci_verified",
  "pending_scheduler",
  "officially_verified",
]);

export const dutyVerificationsTable = pgTable("duty_verifications", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  scheduleId: text("schedule_id").notNull().references(() => schedulesTable.id),
  attendanceId: text("attendance_id").notNull().references(() => attendanceTable.id),
  hospitalId: text("hospital_id").notNull().references(() => hospitalsTable.id),
  departmentId: text("department_id").notNull().references(() => departmentsTable.id),
  ciId: text("ci_id").notNull().references(() => usersTable.id),
  dutyDate: text("duty_date").notNull(),
  status: dutyVerificationStatusEnum("status").notNull().default("waiting_ci"),
  ciRemarks: text("ci_remarks"),
  ciVerifiedAt: timestamp("ci_verified_at", { withTimezone: true }),
  ciVerifiedBy: text("ci_verified_by").references(() => usersTable.id),
  schedulerConfirmedAt: timestamp("scheduler_confirmed_at", { withTimezone: true }),
  schedulerConfirmedBy: text("scheduler_confirmed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dutyVerificationCasesTable = pgTable("duty_verification_cases", {
  id: text("id").primaryKey(),
  dutyVerificationId: text("duty_verification_id")
    .notNull()
    .references(() => dutyVerificationsTable.id, { onDelete: "cascade" }),
  clinicalCaseId: text("clinical_case_id")
    .notNull()
    .references(() => clinicalCasesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DutyVerification = typeof dutyVerificationsTable.$inferSelect;
export type DutyVerificationCase = typeof dutyVerificationCasesTable.$inferSelect;
