import { pgTable, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { hospitalsTable, departmentsTable } from "./hospitals";

export const slotStatusEnum = pgEnum("slot_status", ["open", "closed", "cancelled"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "approved", "rejected"]);

export const dutySlotsTable = pgTable("duty_slots", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitalsTable.id),
  departmentId: text("department_id").notNull().references(() => departmentsTable.id),
  ciId: text("ci_id").references(() => usersTable.id),
  dutyDate: text("duty_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maxStudents: integer("max_students").notNull().default(1),
  isMakeup: boolean("is_makeup").notNull().default(false),
  description: text("description"),
  status: slotStatusEnum("status").notNull().default("open"),
  createdBy: text("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dutyApplicationsTable = pgTable("duty_applications", {
  id: text("id").primaryKey(),
  slotId: text("slot_id").notNull().references(() => dutySlotsTable.id),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  status: applicationStatusEnum("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  notes: text("notes"),
});

export type DutySlot = typeof dutySlotsTable.$inferSelect;
export type DutyApplication = typeof dutyApplicationsTable.$inferSelect;
