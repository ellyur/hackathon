import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// A student's own academic (non-clinical) class schedule, used to detect
// conflicts when a Scheduler assigns a clinical duty.
export const studentAcademicSchedulesTable = pgTable("student_academic_schedules", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  dayOfWeek: text("day_of_week").notNull(), // "monday".."sunday"
  startTime: text("start_time").notNull(), // "HH:MM"
  endTime: text("end_time").notNull(), // "HH:MM"
  semester: text("semester").notNull().default(""),
  schoolYear: text("school_year").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudentAcademicSchedule = typeof studentAcademicSchedulesTable.$inferSelect;
