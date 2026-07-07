import { pgTable, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const announcementTargetEnum = pgEnum("announcement_target", ["all", "student", "ci", "scheduler", "admin"]);

export const announcementsTable = pgTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  targetRole: announcementTargetEnum("target_role").notNull().default("all"),
  postedBy: text("posted_by").references(() => usersTable.id),
  isPinned: boolean("is_pinned").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcementReadsTable = pgTable("announcement_reads", {
  announcementId: text("announcement_id").notNull().references(() => announcementsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Announcement = typeof announcementsTable.$inferSelect;
export type AnnouncementRead = typeof announcementReadsTable.$inferSelect;
