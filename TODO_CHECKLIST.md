# ClinicalFlow — Remaining Work Checklist

Tracking file for features that are partially implemented or missing, based on the
full role-based feature audit. Items already fully working (auth, dashboards, hospital/user
management, attendance with GPS+face verification, scheduling, recommendation engine, case
verification, etc.) are not listed here — only what still needs to be completed.

## Partial (exists but incomplete)

### Admin
- [x] **Hospital attendance radius** — hospital lat/lng and attendanceRadius field are stored,
  exposed in the Add/Edit hospital form, and used by the attendance time-in geofence check.
  ✅ Already fully implemented.
- [x] **Academic management (global lists)** — Admin > Academic Lists page at `/admin/academic`
  with full CRUD (add/edit/delete/toggle) for Sections, Year Levels, Semesters, and School Years.
  Backend: `GET/POST/PATCH/DELETE /api/academic-lists`. Nav item added to admin sidebar.
- [x] **Notification logs** — Admin > Notification Log page at `/admin/notification-log` shows
  all system notifications with type/title/message/user/read-status, filterable by type and
  searchable. Backend: `GET /api/notifications/all`. Nav item added to admin sidebar.
- [x] **Schedule-change notifications** — PATCH `/api/schedules/:id` now fires
  `schedule_change` notifications to all assigned students + the CI whenever hospital,
  department, CI, duty date, time, or status fields change.

## Missing (not implemented)

### Admin
- [x] **Forgot Password flow** — fully implemented: `POST /auth/forgot-password` generates a
  token returned in the response (no email provider); `/forgot-password` and `/reset-password`
  frontend pages exist and are wired to the API. ✅ Already fully implemented.
- [x] **Reports section** — `admin-reports.tsx` now calls `GET /api/reports/:type` with real
  data queries. All 6 report types (attendance-summary, student-progress, case-compliance,
  ci-performance, makeup-duty, completion-forecast) are implemented. Downloads as PDF, CSV,
  or Excel (.xlsx).

### Student
- [x] **Forgot Password flow** — same as admin, works for all roles. ✅ Already fully implemented.
- [x] **Self-service Academic Schedule management** — Student > Academic Schedule page at
  `/academic-schedule` with full CRUD (add/edit/delete) for class entries. Backend:
  `GET/POST/PATCH/DELETE /api/academic-schedules`. Nav item added to student sidebar.

### Clinical Instructor (CI)
- [x] **Student Evaluation** — CI > Evaluations page at `/evaluations` with per-duty star
  rating (1–5) + remarks for each assigned student. Upsert semantics (re-submitting updates
  existing rating). Backend: `GET/POST /api/evaluations`. Nav item added to CI sidebar.

---
**Status key:** [x] = complete. All checklist items are now implemented.
