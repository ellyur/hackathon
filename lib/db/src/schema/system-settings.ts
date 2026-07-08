import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Singleton table — always one row with id = 'singleton'.
 * Use GET /api/settings to read, PATCH /api/settings to update.
 */
export const systemSettingsTable = pgTable("system_settings", {
  id: text("id").primaryKey().default("singleton"),

  // ── General ────────────────────────────────────────────────────────────────
  institutionName: text("institution_name").notNull().default("Philippine College of Nursing"),
  academicYear: text("academic_year").notNull().default("2024-2025"),
  contactEmail: text("contact_email").notNull().default("admin@clinicalflow.com"),

  // ── Attendance ─────────────────────────────────────────────────────────────
  gpsRadius: integer("gps_radius").notNull().default(100),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(15),
  faceVerificationRequired: boolean("face_verification_required").notNull().default(true),
  gpsVerificationRequired: boolean("gps_verification_required").notNull().default(true),

  // ── Notification event toggles ─────────────────────────────────────────────
  emailOnCaseSubmission: boolean("email_on_case_submission").notNull().default(true),
  inAppOnCaseSubmission: boolean("in_app_on_case_submission").notNull().default(true),
  emailOnCaseVerified: boolean("email_on_case_verified").notNull().default(true),
  inAppOnCaseVerified: boolean("in_app_on_case_verified").notNull().default(true),
  emailOnCaseRejected: boolean("email_on_case_rejected").notNull().default(true),
  inAppOnCaseRejected: boolean("in_app_on_case_rejected").notNull().default(true),
  emailOnScheduleAssigned: boolean("email_on_schedule_assigned").notNull().default(false),
  inAppOnScheduleAssigned: boolean("in_app_on_schedule_assigned").notNull().default(true),
  emailOnAttendanceMissed: boolean("email_on_attendance_missed").notNull().default(true),
  inAppOnAttendanceMissed: boolean("in_app_on_attendance_missed").notNull().default(true),
  emailOnSystemAnnouncement: boolean("email_on_system_announcement").notNull().default(true),
  inAppOnSystemAnnouncement: boolean("in_app_on_system_announcement").notNull().default(true),

  // ── Session ────────────────────────────────────────────────────────────────
  sessionTimeout: text("session_timeout").notNull().default("8h"),
  maxLoginAttempts: integer("max_login_attempts").notNull().default(5),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type SystemSettings = typeof systemSettingsTable.$inferSelect;
