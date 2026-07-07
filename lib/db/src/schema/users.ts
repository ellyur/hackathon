import { pgTable, text, boolean, timestamp, integer, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["admin", "scheduler", "ci", "student"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentProfilesTable = pgTable("student_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentNumber: text("student_number").notNull().unique(),
  yearLevel: integer("year_level").notNull().default(1),
  section: text("section").notNull().default("A"),
  program: text("program").notNull().default("BSN"),
  academicYear: text("academic_year").notNull(),
  totalHoursRequired: integer("total_hours_required").notNull().default(500),
  faceDescriptor: json("face_descriptor").$type<number[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ciProfilesTable = pgTable("ci_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().unique(),
  specialization: text("specialization").notNull().default("General"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
export type CIProfile = typeof ciProfilesTable.$inferSelect;
