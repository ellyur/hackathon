# ClinicalFlow — Admin & Scheduler Pages Fix Plan

## Root Causes Identified

### 1. `PlusCircle` icon not imported in `app-shell.tsx`
- **File:** `artifacts/web/src/components/app-shell.tsx`
- **Problem:** The student nav array references `PlusCircle` from lucide-react, but it is not in the import list. In strict ES-module mode this is a `ReferenceError` that crashes `AppShell` on every render, making the content area blank for all roles.
- **Fix:** Add `PlusCircle` to the lucide-react import.

---

### 2. App.tsx routes real implementations exist but are wired to `PlaceholderPage`
- **File:** `artifacts/web/src/App.tsx`
- **Problem:** The following page files are fully implemented but App.tsx never imports them — it uses `PlaceholderPage` instead:

| Route | Current | Should Use |
|---|---|---|
| `/admin/hospitals` | PlaceholderPage | `AdminHospitalsPage` |
| `/admin/hospitals/:id/departments` | PlaceholderPage | `AdminDepartmentsPage` |
| `/admin/cases` | PlaceholderPage | `AdminCasesPage` |
| `/admin/recommendation-weights` | PlaceholderPage | `RecommendationWeightsPage` |
| `/admin/reports` | PlaceholderPage | `AdminReportsPage` |
| `/admin/audit` | PlaceholderPage | `AdminAuditPage` |
| `/admin/settings` | PlaceholderPage | `AdminSettingsPage` |
| `/announcements/manage` | PlaceholderPage | `ManageAnnouncementsPage` |
| `/notifications` | PlaceholderPage | `NotificationsPage` |
| `/announcements` | PlaceholderPage | `AnnouncementsPage` |
| `/attendance` | PlaceholderPage | `AttendanceHistoryPage` |
| `/slots/my-applications` | PlaceholderPage | `MyApplicationsPage` |
| `/schedules/:id/recommendations` | PlaceholderPage | `StudentRecommendationsPage` |
| `/duties/:id/verify` | PlaceholderPage | `VerifyCasePage` |

- **Fix:** Add the missing imports and swap `PlaceholderPage` with the real components.

---

### 3. Analytics API — data shape mismatches

#### 3a. `/api/analytics/case-gaps` returns wrong shape
- **File:** `artifacts/api-server/src/routes/analytics.ts`
- **Problem:** The route returns `[{ studentId, studentName, gaps }]` (an array) but the generated TypeScript client expects `CaseGapMatrix: { cases: ClinicalCase[], students: User[], gaps: CaseGapEntry[] }`.
- **Fix:** Rewrite the endpoint to return the `CaseGapMatrix` shape.

#### 3b. `/api/analytics/makeup-queue` endpoint is missing
- **File:** `artifacts/api-server/src/routes/analytics.ts`
- **Problem:** The generated client has `useGetMakeupQueue()` calling `GET /api/analytics/makeup-queue`, but the route does not exist — the hook gets a 404 and the Makeup Duties page stays empty.
- **Expected return type:** `MakeupQueueItem[]` where each item has `{ studentId, firstName, lastName, avatarUrl?, absenceDate, scheduleId, daysSinceAbsence }`.
- **Fix:** Add the endpoint: find students with `absent` attendance records in the last 60 days who do not yet have a makeup duty scheduled, and return them sorted by `daysSinceAbsence` descending.

#### 3c. `/api/analytics/hospital-utilization` returns wrong field names
- **File:** `artifacts/api-server/src/routes/analytics.ts`
- **Problem:** Returns `{ totalSchedules, totalStudentAssignments }` but the `HospitalUtilization` type expects `{ studentCount, activeRotations }`.
- **Fix:** Rename the returned fields to match the schema.

---

### 4. Broken internal link in Master Schedule page
- **File:** `artifacts/web/src/pages/master-schedule.tsx`
- **Problem:** "New Schedule" button links to `/schedules/new` but the route in App.tsx is `/schedules/create`.
- **Fix:** Change `href="/schedules/new"` → `href="/schedules/create"`.

---

### 5. Admin Hospitals & Cases pages use hardcoded mock data
- **Files:** `artifacts/web/src/pages/admin-hospitals.tsx`, `artifacts/web/src/pages/admin-cases.tsx`
- **Problem:** Both pages define a `MOCK_*` array and operate on local React state. Changes are never persisted; reloading the page resets all data.
- **Fix:** Replace mock-data state with real API hooks:
  - `admin-hospitals.tsx` → `useListHospitals`, `useCreateHospital`, `useUpdateHospital`, `useQueryClient` for cache invalidation.
  - `admin-cases.tsx` → `useListClinicalCases`, `useCreateClinicalCase`, `useUpdateClinicalCase`.

---

## Implementation Order

Because item 1 is crashing the shell for all users, and item 2 is why the admin nav goes nowhere, these two need to land first. The rest can be done in the same pass since they are all independent.

1. **Fix `app-shell.tsx`** (import `PlusCircle`) — unblocks all roles
2. **Fix `App.tsx`** (wire up real pages) — unblocks admin nav
3. **Fix `analytics.ts`** (shape fixes + add makeup-queue) — unblocks Makeup Duties and Case Gaps pages
4. **Fix `master-schedule.tsx`** (broken link) — small, safe
5. **Rewire `admin-hospitals.tsx`** to real API — makes hospital CRUD persist
6. **Rewire `admin-cases.tsx`** to real API — makes case library CRUD persist

After all edits, restart the `artifacts/api-server` and `artifacts/web` workflows and do a final smoke-test screenshot.

---

## Files to Change

| File | Change |
|---|---|
| `artifacts/web/src/components/app-shell.tsx` | Add `PlusCircle` import |
| `artifacts/web/src/App.tsx` | Import + wire 14 real pages |
| `artifacts/api-server/src/routes/analytics.ts` | Fix case-gaps shape, add makeup-queue, fix utilization fields |
| `artifacts/web/src/pages/master-schedule.tsx` | Fix broken `/schedules/new` link |
| `artifacts/web/src/pages/admin-hospitals.tsx` | Replace MOCK_HOSPITALS with real API hooks |
| `artifacts/web/src/pages/admin-cases.tsx` | Replace MOCK_CASES with real API hooks |
