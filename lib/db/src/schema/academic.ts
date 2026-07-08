import { pgTable, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const academicListTypeEnum = pgEnum("academic_list_type", [
  "section",
  "year_level",
  "semester",
  "school_year",
]);

// Generic lookup-list table backing Admin > Academic Management screens:
// Sections, Year Levels, Semesters, School Years.
export const academicListItemsTable = pgTable("academic_list_items", {
  id: text("id").primaryKey(),
  type: academicListTypeEnum("type").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AcademicListItem = typeof academicListItemsTable.$inferSelect;
