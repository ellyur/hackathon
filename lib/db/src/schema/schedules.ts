import { pgTable, text, timestamp, integer, real, pgEnum, json } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { hospitalsTable, departmentsTable } from "./hospitals";

export const scheduleStatusEnum = pgEnum("schedule_status", ["upcoming", "active", "completed", "cancelled"]);

export const schedulesTable = pgTable("schedules", {
  id: text("id").primaryKey(),
  title: text("title"),
  hospitalId: text("hospital_id").notNull().references(() => hospitalsTable.id),
  departmentId: text("department_id").notNull().references(() => departmentsTable.id),
  ciId: text("ci_id").notNull().references(() => usersTable.id),
  dutyDate: text("duty_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  gracePeriodMin: integer("grace_period_min").notNull().default(15),
  /** Official duty hours for this shift — set by the Scheduler. Awards this many hours to students on completion. */
  dutyHours: real("duty_hours"),
  status: scheduleStatusEnum("status").notNull().default("upcoming"),
  notes: text("notes"),
  /** Reason given by the Scheduler/Admin when cancelling this duty schedule. */
  cancellationReason: text("cancellation_reason"),
  cancelledBy: text("cancelled_by").references(() => usersTable.id),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  // Student assignment controls
  maxStudents: integer("max_students").notNull().default(10),
  requiredYearLevel: integer("required_year_level"),
  eligibleSections: text("eligible_sections"),
  caseTypeId: text("case_type_id"),
  createdBy: text("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleStudentsTable = pgTable("schedule_students", {
  scheduleId: text("schedule_id").notNull().references(() => schedulesTable.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  // AI recommendation data stored at assignment time
  recommendationScore: integer("recommendation_score"),
  recommendationReasons: json("recommendation_reasons").$type<string[]>(),
});

export type Schedule = typeof schedulesTable.$inferSelect;
export type ScheduleStudent = typeof scheduleStudentsTable.$inferSelect;
