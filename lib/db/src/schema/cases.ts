import { pgTable, text, boolean, timestamp, integer, real, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { hospitalsTable } from "./hospitals";
import { departmentsTable } from "./hospitals";

export const caseStatusEnum = pgEnum("case_status", ["pending", "verified", "rejected"]);

export const clinicalCasesTable = pgTable("clinical_cases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  requiredCount: integer("required_count").notNull().default(1),
  /** Reference-only: displayed in reports but does NOT add to a student's Duty Hours. */
  hourValue: real("hour_value"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const caseCompletionsTable = pgTable("case_completions", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  clinicalCaseId: text("clinical_case_id").notNull().references(() => clinicalCasesTable.id),
  scheduleId: text("schedule_id").notNull(),
  hospitalId: text("hospital_id").notNull().references(() => hospitalsTable.id),
  departmentId: text("department_id").notNull().references(() => departmentsTable.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by").references(() => usersTable.id),
  status: caseStatusEnum("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
});

export type ClinicalCase = typeof clinicalCasesTable.$inferSelect;
export type CaseCompletion = typeof caseCompletionsTable.$inferSelect;
