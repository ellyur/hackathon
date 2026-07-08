# ClinicalFlow — Remaining Work Checklist

Tracking file for features that are partially implemented or missing, based on the
full role-based feature audit. Items already fully working (auth, dashboards, hospital/user
management, attendance with GPS+face verification, scheduling, recommendation engine, case
verification, etc.) are not listed here — only what still needs to be completed.

## Partial (exists but incomplete)

### Admin
- [ ] **Hospital attendance radius** — hospital lat/lng is stored, but the geofence radius
  used for attendance is not independently configurable per hospital.
- [ ] **Academic management (global lists)** — year level / section / school year exist as
  free-form fields on student profiles, but there is no admin screen to manage them as
  reusable, structured lists (add/edit/delete Sections, Year Levels, Semesters, School Years).
- [ ] **Notification logs** — announcements/broadcasts can be sent, but there is no log/history
  view of past notifications sent.
- [ ] **Schedule-change notifications** — auto-notification on schedule edits appears stubbed;
  needs to actually fire to affected students/CIs when a schedule is changed.

## Missing (not implemented)

### Admin
- [ ] **Forgot Password flow** — no backend route or UI for password reset via email/token.
- [ ] **Reports section** — `admin-reports.tsx` is a UI shell with no real data wiring:
  - [ ] Attendance Report
  - [ ] Clinical Hours Report
  - [ ] Student Progress Report
  - [ ] Export to PDF
  - [ ] Export to Excel

### Student
- [ ] **Forgot Password flow** — same as above, needs to work for student accounts too.
- [ ] **Self-service Academic Schedule management** — students cannot add/edit/delete their
  own semester schedule entries.

### Clinical Instructor (CI)
- [ ] **Student Evaluation** — no evaluation form or database schema exists for a CI to submit
  a rating/evaluation of a student's clinical performance.

---
**Status key:** unchecked = not started. Check items off as they're completed, or delete
entries once fully implemented and verified.
