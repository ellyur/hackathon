---
name: ClinicalFlow Architecture
description: Key architectural decisions for the ClinicalFlow clinical rotation management platform
---

## Auth
- Session-based auth using express-session + SESSION_SECRET env var
- Backend: `POST /api/auth/login` validates email+password against mock data, sets `req.session.userId` and `req.session.role`
- Frontend `useAuth` hook has dual mode:
  - **Mock mode**: `localStorage.getItem('mockRole')` → returns hardcoded user, bypasses real API (dev only, via DevRoleSwitcher)
  - **Live mode**: calls `useGetMe()` → hits `GET /api/auth/me` → real session cookie
- Login page calls `useLogin` mutation (real API), clears mockRole from localStorage on success
- `useLogout` mutation calls `POST /api/auth/logout`, clears session cookie server-side

## Backend
- All data is in-memory mock data in `artifacts/api-server/src/lib/mockData.ts`
- No real DB connected yet — user said they'll provide DB later
- Schema for real DB is NOT written yet (was deferred); mockData.ts has the full type shape for all tables
- API base path: `/api` (do not change)
- CORS: `credentials: true`, `origin: true`

## Frontend
- `credentials: 'include'` is set globally in `lib/api-client-react/src/custom-fetch.ts` — all API calls send cookies
- Google Fonts (Plus Jakarta Sans) loaded via `<link>` in `index.html`, NOT via CSS `@import` (avoids PostCSS ordering error with Tailwind v4)
- Wouter for routing, React Query for data fetching
- DevRoleSwitcher: select "Live Auth" for real session, select a role for instant mock dev mode

## Data IDs (mock seed)
- Admin: u-admin-001 | Scheduler: u-scheduler-001 | CI1: u-ci-001 | CI2: u-ci-002
- Students: u-student-001 through u-student-006
- Hospitals: h-001 (PGH), h-002 (JRMMC), h-003 (Makati Med)

**Why:** User wants mock data first, real DB later. The architecture separates concern so DB can be swapped by replacing mockData.ts queries with Drizzle ORM calls without touching route logic.
