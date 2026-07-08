import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { schedulesTable } from "./schedules";

// A Clinical Instructor's evaluation of a student's performance for a given duty.
export const evaluationsTable = pgTable("evaluations", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => schedulesTable.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  ciId: text("ci_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(), // 1-5
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Evaluation = typeof evaluationsTable.$inferSelect;
