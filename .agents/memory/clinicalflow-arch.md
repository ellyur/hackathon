---
name: ClinicalFlow architecture
description: Auth, DB layer, dual-mode frontend auth, and DB migration status
---

## Auth
- Session-cookie auth via express-session + SESSION_SECRET env var
- Sessions in-memory (no pg session store yet — acceptable for dev)
- bcrypt@6 with cost factor 12 for all password hashing
- All routes use `requireAuth` / `requireRole` middlewares from `middlewares/auth.js`

## DB layer
- Drizzle ORM + pg Pool; client exported from `@workspace/db` (lib/db/src/index.ts)
- All 9 schema files pushed to PostgreSQL; schema is in sync
- Seed: run `DATABASE_URL=... pnpm dlx tsx scripts/seed.ts` (idempotent via onConflictDoNothing)

## Migration status (complete as of 2026-07-07)
All route files now use real DB queries — mock data is fully replaced:
- auth.ts, users.ts, hospitals.ts, cases.ts, schedules.ts, attendance.ts
- slots.ts, notifications.ts, announcements.ts, analytics.ts, recommendations.ts, students.ts
- mockData.ts remains for reference only (not imported by any route)

## Security decisions applied
- PATCH /users/:id — self-only or admin; `isActive` field is admin-only
- GET /schedules/:id — students blocked to non-assigned; CIs blocked to non-owned
- POST /attendance/time-in — requires schedule assignment + gps+face+liveness all true
- POST /attendance/ci-assisted — CI must own schedule; student must be assigned to it
- GET /attendance — CIs scoped to their own schedules only
- analytics/hospital-utilization — uses Drizzle inArray (no sql.raw)

## Frontend auth modes
Dual-mode: real session auth (prod) and dev-mock pass-through (dev)
