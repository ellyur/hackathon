import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const academicYearSettingsTable = pgTable("academic_year_settings", {
  id: text("id").primaryKey(),
  schoolYear: text("school_year").notNull(),   // e.g. "2026-2027"
  semester: text("semester").notNull(),         // e.g. "Semester 1"
  requiredTotalDutyHours: integer("required_total_duty_hours").notNull().default(500),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AcademicYearSettings = typeof academicYearSettingsTable.$inferSelect;
