---
name: Duty Verification Workflow
description: Design decisions for the 3-role duty verification workflow (Student → CI → Scheduler) and passport duty-day tracking
---

## The Workflow
1. Student attends duty (GPS + face verified) → status appears in attended duties
2. Student presses "Request Duty Verification" (only allowed for present/late attendance)
3. Creates `duty_verifications` record with status `waiting_ci`
4. CI reviews in `/verifications` page → selects clinical cases completed during that duty → clicks "Verify Duty" → status `pending_scheduler`
5. Scheduler reviews in `/duty-verifications` page → clicks "Confirm Verification" → status `officially_verified`
6. On confirm: passport duty days +1 for that ward, case_completions auto-created for CI-selected cases

## Status Enum
`waiting_ci → pending_scheduler → officially_verified`
Note: `ci_verified` is in the DB enum but is never used (CI jumps directly to `pending_scheduler`). Can be removed in a future cleanup.

## Key Integrity Guards
- DB unique constraint: `(attendance_id, student_id)` on `duty_verifications` — one verification per attendance, ever (even after officially_verified)
- API guard in POST: rejects if any existing record exists for that attendance+student
- API guard: rejects requests for attendance with status other than `present` or `late`
- Cases POST (`/case-completions`) restricted to `scheduler` and `admin` roles only — students cannot submit cases directly

## Navigation / Routing
- CI nav "Duty Verifications" → `/verifications` → `PendingVerificationsPage` (shows `waiting_ci` requests assigned to CI)
- Scheduler nav "Duty Verifications" → `/duty-verifications` → `SchedulerDutyVerificationsPage` (shows all statuses in tabs)
- Detail page: `/duty-verifications/:id` → `DutyVerificationDetailPage` (role-aware: CI sees verify action, Scheduler sees confirm action)
- Back button in detail: CI → `/verifications`; Scheduler/admin/student → `/duty-verifications`

## Passport Calculation
- `GET /students/:id/passport` aggregates all active departments with `requiredDutyDays > 0`
- Completed duty days = count of `officially_verified` duty_verifications for that student × department
- Not scoped per-hospital (curriculum requirements are global)

## New DB Tables
- `duty_verifications`: tracks each student's verification request
- `duty_verification_cases`: junction table linking a verification to selected clinical cases (created by CI during review)
- `departments.required_duty_days` / `departments.required_duty_hours`: per-department curriculum requirements

**Why:** Duty days (not hours) are the primary metric. Admins configure requirements on the department. Progress is earned only via the 3-role verification workflow, preventing students from self-reporting.

**How to apply:** Admin must set `required_duty_days` on each department via the admin panel (or direct DB) for passport progress to show. Until set, all wards show 0/0.
