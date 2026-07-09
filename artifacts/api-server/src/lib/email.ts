/**
 * Email service — powered by Resend.
 * Gracefully degrades (logs only) if RESEND_API_KEY is not set.
 */

import { Resend } from "resend";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Client ─────────────────────────────────────────────────────────────────────

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ── HTML escape ────────────────────────────────────────────────────────────────

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Brand constants ────────────────────────────────────────────────────────────

const FROM = process.env.EMAIL_FROM ?? "SIPAG <no-reply@sipag.online>";
const APP_URL = process.env.APP_URL ?? "https://sipag.online";
const PRIMARY = "#f97316"; // orange
const DARK = "#1e293b";    // dark blue-slate

// ── Base layout ────────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${DARK};border-radius:12px 12px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SIPAG</span>
                  <span style="font-size:11px;color:#94a3b8;margin-left:8px;text-transform:uppercase;letter-spacing:1px;">Clinical Scheduling</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This is an automated message from SIPAG — Smart Integrated Platform for Academic &amp; Clinical Scheduling.<br/>
              © ${new Date().getFullYear()} SIPAG. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${DARK};">${esc(text)}</h1>`;
}

/** Para accepts pre-escaped/static HTML only — caller must escape any dynamic values with esc(). */
function para(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${text}</p>`;
}

function infoBox(rows: [string, string][]): string {
  const cells = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;width:40%;">${esc(label)}</td>
        <td style="padding:8px 12px;font-size:13px;color:${DARK};font-weight:500;">${esc(value)}</td>
      </tr>`)
    .join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;overflow:hidden;">
      <tbody>${cells}</tbody>
    </table>`;
}

function ctaButton(label: string, url: string): string {
  return `
    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${url}" style="display:inline-block;background:${PRIMARY};color:#ffffff;font-size:14px;font-weight:700;
        padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">${label}</a>
    </div>`;
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:600;
    padding:3px 10px;border-radius:20px;margin-bottom:16px;">${text}</span>`;
}

// ── Email helpers ──────────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<{ email: string; firstName: string; lastName: string } | null> {
  const [user] = await db
    .select({ email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user ?? null;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

async function send(opts: SendOptions): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${opts.to}: "${opts.subject}"`);
    return;
  }
  try {
    const { error } = await client.emails.send({ from: FROM, ...opts });
    if (error) console.error("[email] Resend error:", error);
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Look up email from userId then send. No-op if user not found. */
export async function sendEmailToUser(
  userId: string,
  subject: string,
  html: string,
): Promise<void> {
  const user = await getUserEmail(userId);
  if (!user?.email) return;
  await send({ to: user.email, subject, html });
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

// 1. Duty Assigned ─────────────────────────────────────────────────────────────
export async function emailDutyAssigned(opts: {
  studentId: string;
  hospital: string;
  department: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
  ciName: string;
  scheduleId: string;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Duty Assigned",
    `
    ${badge("New Duty Assignment", "#ea580c", "#fff7ed")}
    ${heading("You've been assigned to a clinical duty")}
    ${para(`Hi ${esc(user.firstName)}, your scheduler has assigned you to the following clinical duty. Please review the details below and make sure to time in on the scheduled date.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Time", `${opts.startTime} – ${opts.endTime}`],
      ["Clinical Instructor", opts.ciName],
    ])}
    ${ctaButton("View My Schedule", `${APP_URL}/schedule`)}
    ${para('<span style="font-size:13px;color:#94a3b8;">You must be physically present at the hospital to time in using GPS and face verification.</span>')}
  `,
  );

  await send({ to: user.email, subject: `📋 Duty Assigned — ${opts.hospital} on ${opts.dutyDate}`, html });
}

// 2. Duty Cancelled ────────────────────────────────────────────────────────────
export async function emailDutyCancelled(opts: {
  recipientId: string;
  hospital: string;
  department: string;
  dutyDate: string;
  startTime: string;
  reason: string;
}): Promise<void> {
  const user = await getUserEmail(opts.recipientId);
  if (!user?.email) return;

  const html = layout(
    "Duty Cancelled",
    `
    ${badge("Duty Cancelled", "#dc2626", "#fef2f2")}
    ${heading("A duty has been cancelled")}
    ${para(`Hi ${esc(user.firstName)}, the following duty has been cancelled by the scheduler.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Time", opts.startTime],
      ["Reason", opts.reason],
    ])}
    ${ctaButton("View My Schedule", `${APP_URL}/schedule`)}
  `,
  );

  await send({ to: user.email, subject: `❌ Duty Cancelled — ${opts.hospital} on ${opts.dutyDate}`, html });
}

// 3. Schedule Updated ──────────────────────────────────────────────────────────
export async function emailScheduleUpdated(opts: {
  recipientId: string;
  hospital: string;
  dutyDate: string;
  changeDetail: string;
  scheduleId: string;
}): Promise<void> {
  const user = await getUserEmail(opts.recipientId);
  if (!user?.email) return;

  const html = layout(
    "Schedule Updated",
    `
    ${badge("Schedule Updated", "#d97706", "#fffbeb")}
    ${heading("Your duty schedule has been modified")}
    ${para(`Hi ${esc(user.firstName)}, there has been an update to one of your clinical duties.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Change", opts.changeDetail],
    ])}
    ${ctaButton("View Updated Schedule", `${APP_URL}/schedule`)}
  `,
  );

  await send({ to: user.email, subject: `📝 Schedule Updated — ${opts.hospital} on ${opts.dutyDate}`, html });
}

// 4. CI Duty Note ──────────────────────────────────────────────────────────────
export async function emailCIDutyNote(opts: {
  studentId: string;
  ciName: string;
  hospital: string;
  department: string;
  dutyDate: string;
  note: string;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Note from Your Clinical Instructor",
    `
    ${badge("CI Note", "#7c3aed", "#f5f3ff")}
    ${heading("Your Clinical Instructor left a note")}
    ${para(`Hi ${esc(user.firstName)}, <strong>${esc(opts.ciName)}</strong> has added a note to your upcoming duty.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
    ])}
    <div style="background:#fefce8;border:1px solid #fde047;border-left:4px solid #f97316;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Note from CI</p>
      <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.6;">${esc(opts.note)}</p>
    </div>
    ${ctaButton("View My Schedule", `${APP_URL}/schedule`)}
  `,
  );

  await send({ to: user.email, subject: `📌 CI Note for Your Duty on ${opts.dutyDate}`, html });
}

// 5. Duty Verification Requested (to CI) ──────────────────────────────────────
export async function emailVerificationRequested(opts: {
  ciId: string;
  studentName: string;
  hospital: string;
  department: string;
  dutyDate: string;
  verificationId: string;
}): Promise<void> {
  const user = await getUserEmail(opts.ciId);
  if (!user?.email) return;

  const html = layout(
    "New Duty Verification Request",
    `
    ${badge("Action Required", "#ea580c", "#fff7ed")}
    ${heading("A student has requested duty verification")}
    ${para(`Hi ${esc(user.firstName)}, <strong>${esc(opts.studentName)}</strong> has submitted a duty verification request for your review.`)}
    ${infoBox([
      ["Student", opts.studentName],
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Duty Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
    ])}
    ${ctaButton("Review & Verify", `${APP_URL}/duty-verifications/${opts.verificationId}`)}
    ${para('<span style="font-size:13px;color:#94a3b8;">Please review the student\'s attendance and submitted clinical cases before verifying.</span>')}
  `,
  );

  await send({ to: user.email, subject: `🔔 Verification Request from ${opts.studentName} — ${opts.dutyDate}`, html });
}

// 6. CI Verified Duty (to Student) ────────────────────────────────────────────
export async function emailCIVerified(opts: {
  studentId: string;
  ciName: string;
  hospital: string;
  dutyDate: string;
  verificationId: string;
  remarks?: string | null;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Duty Verified by CI",
    `
    ${badge("CI Verified", "#0891b2", "#ecfeff")}
    ${heading("Your duty has been verified by your CI")}
    ${para(`Hi ${esc(user.firstName)}, your Clinical Instructor <strong>${esc(opts.ciName)}</strong> has verified your duty. It is now pending final confirmation by the Scheduler.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Duty Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Status", "Pending Scheduler Confirmation"],
      ...(opts.remarks ? [["CI Remarks", opts.remarks] as [string, string]] : []),
    ])}
    ${ctaButton("Track Verification Status", `${APP_URL}/duty-verifications/${opts.verificationId}`)}
  `,
  );

  await send({ to: user.email, subject: `✅ Duty Verified by CI — Pending Scheduler Confirmation`, html });
}

// 7. Officially Verified (to Student) ─────────────────────────────────────────
export async function emailOfficiallyVerified(opts: {
  studentId: string;
  hospital: string;
  department: string;
  dutyDate: string;
  verificationId: string;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Duty Officially Verified",
    `
    ${badge("Officially Verified ✓", "#059669", "#ecfdf5")}
    ${heading("Your duty is officially verified!")}
    ${para(`Congratulations ${esc(user.firstName)}! Your duty has been officially verified by the Scheduler. Your Clinical Passport has been updated with the completed cases.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Duty Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Status", "Officially Verified"],
    ])}
    ${ctaButton("View Your Clinical Passport", `${APP_URL}/passport`)}
    ${para('<span style="font-size:13px;color:#94a3b8;">Your completed clinical cases are now recorded in your passport and will count toward your requirements.</span>')}
  `,
  );

  await send({ to: user.email, subject: `🎉 Duty Officially Verified — Clinical Passport Updated`, html });
}

// 8. Verification Returned to Student ─────────────────────────────────────────
export async function emailVerificationReturned(opts: {
  studentId: string;
  ciName: string;
  dutyDate: string;
  reason?: string | null;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Duty Verification Returned",
    `
    ${badge("Returned — Action Required", "#dc2626", "#fef2f2")}
    ${heading("Your verification request was returned")}
    ${para(`Hi ${esc(user.firstName)}, your CI <strong>${esc(opts.ciName)}</strong> has returned your duty verification request. Please review the reason below and resubmit.`)}
    ${opts.reason
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
          <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.6;">${esc(opts.reason)}</p>
        </div>`
      : ""}
    ${infoBox([
      ["Duty Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Returned by", opts.ciName],
    ])}
    ${ctaButton("Resubmit Verification Request", `${APP_URL}/schedule`)}
  `,
  );

  await send({ to: user.email, subject: `⚠️ Verification Request Returned — Action Needed`, html });
}

// 9. Slot Approved ─────────────────────────────────────────────────────────────
export async function emailSlotApproved(opts: {
  studentId: string;
  hospital: string;
  department: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Duty Slot Application Approved",
    `
    ${badge("Application Approved", "#059669", "#ecfdf5")}
    ${heading("Your duty slot application has been approved!")}
    ${para(`Great news ${esc(user.firstName)}! Your application for a duty slot has been approved by the scheduler.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Time", `${opts.startTime} – ${opts.endTime}`],
    ])}
    ${ctaButton("View My Schedule", `${APP_URL}/schedule`)}
  `,
  );

  await send({ to: user.email, subject: `✅ Duty Slot Approved — ${opts.hospital} on ${opts.dutyDate}`, html });
}

// 10. Slot Rejected ───────────────────────────────────────────────────────────
export async function emailSlotRejected(opts: {
  studentId: string;
  hospital: string;
  department: string;
  dutyDate: string;
  notes?: string | null;
}): Promise<void> {
  const user = await getUserEmail(opts.studentId);
  if (!user?.email) return;

  const html = layout(
    "Duty Slot Application Not Approved",
    `
    ${badge("Application Not Approved", "#dc2626", "#fef2f2")}
    ${heading("Your duty slot application was not approved")}
    ${para(`Hi ${esc(user.firstName)}, unfortunately your application for the following duty slot was not approved.`)}
    ${infoBox([
      ["Hospital", opts.hospital],
      ["Department", opts.department],
      ["Date", new Date(opts.dutyDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ...(opts.notes ? [["Reason", opts.notes] as [string, string]] : []),
    ])}
    ${ctaButton("View Available Slots", `${APP_URL}/duty-slots`)}
    ${para('<span style="font-size:13px;color:#94a3b8;">You may apply for other available duty slots from the Duty Slots page.</span>')}
  `,
  );

  await send({ to: user.email, subject: `❌ Duty Slot Not Approved — ${opts.hospital}`, html });
}
