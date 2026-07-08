import { pgTable, text, boolean, timestamp, real, integer } from "drizzle-orm/pg-core";

export const hospitalsTable = pgTable("hospitals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  contactNumber: text("contact_number").notNull().default(""),
  latitude: real("latitude").notNull().default(0),
  longitude: real("longitude").notNull().default(0),
  attendanceRadius: integer("attendance_radius").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departmentsTable = pgTable("departments", {
  id: text("id").primaryKey(),
  hospitalId: text("hospital_id").notNull().references(() => hospitalsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  requiredDutyDays: integer("required_duty_days").notNull().default(0),
  requiredDutyHours: integer("required_duty_hours").notNull().default(0),
});

export type Hospital = typeof hospitalsTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
