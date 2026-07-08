# ClinicalFlow Update Plan

## Overview
Three modules are being extended — **Scheduler**, **Admin (Hospitals)**, and **Student Attendance** — without removing any existing features or redesigning the UI. All new UI follows the existing ClinicalFlow design system (shadcn/ui, Tailwind, dark sidebar).

**Map library:** Leaflet + OpenStreetMap (react-leaflet). No API key required.  
**Status:** DB migration already applied. `leaflet`, `react-leaflet`, `@types/leaflet` already installed.

---

## 1. Database Changes
**Already applied via `ALTER TABLE`.**

| Table | New Column | Type | Default | Purpose |
|---|---|---|---|---|
| `schedules` | `max_students` | integer | 10 | Required student count per schedule |
| `schedules` | `required_year_level` | integer | NULL | Optional year level filter |
| `schedules` | `eligible_sections` | text | NULL | Comma-separated allowed sections |
| `schedules` | `case_type_id` | text | NULL | Clinical case type link |

### Schema file update
`lib/db/src/schema/schedules.ts` — add the 4 new columns with Drizzle column definitions.

---

## 2. Backend API Changes

### 2a. Enrich Schedule Response (`artifacts/api-server/src/routes/schedules.ts`)
Update `enrichSchedule()` to join and embed:
- `hospital` object (id, name, latitude, longitude, attendanceRadius)
- `department` object (id, name)
- `ci` object (id, firstName, lastName)
- New fields: maxStudents, requiredYearLevel, eligibleSections, caseTypeId

**Why:** The frontend calendar needs hospital name + department name inline. Currently these are undefined and fall back to raw IDs.

### 2b. Accept New Fields on POST/PATCH
`POST /schedules` and `PATCH /schedules/:id` now accept:
- `maxStudents`, `requiredYearLevel`, `eligibleSections`, `caseTypeId`

### 2c. New: Student Recommendations Endpoint
```
GET /api/schedules/recommendations
  ?dutyDate=2026-07-15
  &hospitalId=...
  &departmentId=...
  &yearLevel=3          (optional)
  &sections=A,B         (optional)
  &excludeScheduleId=   (optional — exclude already-assigned students)
```

**Algorithm:**
1. Fetch all active students + their `student_profiles`
2. Filter by `yearLevel` (if provided) and `sections` (if provided)
3. Exclude students already assigned to any schedule on `dutyDate`
4. For each remaining student:
   - Count total assigned duties (from `schedule_students`)
   - Calculate attendance rate (attended / total schedules)
5. Compute score (0–100):
   - Attendance rate × 40 pts
   - Inverse duty count × 40 pts (fewer hours = higher score)
   - Section matches eligible list → +20 pts
6. Return sorted descending, with `score`, `reasons[]`, and full student profile

---

## 3. New Shared Components

### 3a. `artifacts/web/src/lib/leaflet-init.ts`
Fixes Leaflet's broken default marker icons in Vite/bundler environments. Imported once by any component that uses a map.

### 3b. `artifacts/web/src/components/map-location-picker.tsx`
Self-contained interactive map for selecting a GPS coordinate.

| Feature | Implementation |
|---|---|
| Base map | Leaflet + OpenStreetMap tiles |
| Draggable pin | `useMapEvents` on drag end |
| Search bar | Nominatim geocoding API (free, no key) |
| My Location button | `navigator.geolocation.getCurrentPosition` |
| Reverse geocoding | Nominatim reverse API — auto-fills address on drag |
| Props | `lat`, `lng`, `address`, `onChange(lat, lng, address)` |

### 3c. `artifacts/web/src/components/attendance-map.tsx`
Live GPS navigation map for the student time-in experience.

| Feature | Implementation |
|---|---|
| Base map | Leaflet + OpenStreetMap tiles |
| Student marker | Blue pulsing dot, updates in real time |
| Hospital marker | Red hospital pin |
| Attendance radius | `<Circle>` colored red/orange/green by distance |
| Route line | Straight polyline student → hospital |
| Status panel | Color-coded card: 🔴 Outside / 🟡 Approaching / 🟢 Inside |
| GPS watching | `navigator.geolocation.watchPosition` |
| Props | `hospitalLat`, `hospitalLng`, `attendanceRadius`, `studentLat`, `studentLng`, `distance`, `withinRange` |

---

## 4. Scheduler Module — Master Schedule Calendar

### File: `artifacts/web/src/pages/master-schedule.tsx` (rewrite)

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│ Master Schedule           [📋 List] [📅 Calendar]  [+ New] │
├────────────────────────────────────────────────────────┤
│  < July 2026 >                                          │
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat                      │
│  ┌───┬───┬───┬───┬───┬───┬───┐                         │
│  │   │   │ 1 │ 2 │ 3 │ 4 │ 5 │                         │
│  │   │   │   │🔵DR│   │   │   │                         │
│  ├───┼───┼───┼───┼───┼───┼───┤                         │
│  │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │                         │
│  │   │🟢ICU│   │   │+2 │   │   │                         │
│  └───┴───┴───┴───┴───┴───┴───┘                         │
└────────────────────────────────────────────────────────┘
```

**Calendar chip color key:**
| Status | Color |
|---|---|
| `upcoming` | Blue |
| `active` | Green |
| `completed` | Grey |
| `cancelled` | Red |

**Day cell click → Day Sheet (Dialog):**
- Shows date header
- Lists all schedules for that day (hospital, dept, time, student count, status badge)
- Clicking a schedule opens **Schedule Detail Modal**
- "Create Schedule" button opens **Create Schedule Modal**

**Create Schedule Modal (inside master-schedule page):**

Fields:
- Hospital (select)
- Department / Area (filtered by hospital)
- Clinical Case Type (optional text)
- Clinical Instructor (select)
- Duty Date (pre-filled from clicked day)
- Start Time / End Time
- Required Students (number, default 10)
- Eligible Sections (text, e.g. "A, B, C")
- Required Year Level (select 1–4, optional)
- Attendance Radius Override (optional, metres)
- Remarks

Buttons: **Cancel** | **Generate Recommendations →**

**Recommendations View (step 2 inside modal):**
- Shows "Recommended Students" list
- Each card:
  ```
  ┌───────────────────────────────────────────────┐
  │ [Avatar] Maria Santos        Score: 96%        │
  │          Section 3-A · Year 3                  │
  │          ✅ No Conflict  ✅ Good Attendance     │
  │          ⬇ Low Duty Hours                      │
  │                              [Skip] [Assign]   │
  └───────────────────────────────────────────────┘
  ```
- Search bar for manual student lookup
- Shows count: "3 / 10 assigned"
- "← Back" and "Save Schedule" buttons

**Assigned Students panel (in Schedule Detail Modal):**
- Table: Name | Section | Attendance Status | Duty Status | Actions
- Remove / Replace buttons per row

**Existing List View (toggle):** unchanged from current implementation.

---

## 5. Admin Module — Hospital Map Picker

### File: `artifacts/web/src/pages/admin-hospitals.tsx` (update)

The Add/Edit dialog is expanded:

**Existing fields (kept):** Hospital Name, Address, Contact Number, Attendance Radius, Status toggle

**Changed:** Latitude + Longitude manual text inputs → **replaced** by an embedded `<MapLocationPicker>` component inside the dialog.

**Map picker behavior:**
1. Dialog opens → map centered on current lat/lng (or Philippines default 14.5995, 120.9842)
2. Admin can:
   - Drag the pin to the hospital entrance
   - Type a hospital name/address in the search bar → map pans + places pin
   - Click "My Location" to snap to device location
3. On pin move → Nominatim reverse-geocodes → auto-fills Address field
4. On save → lat/lng passed to existing `createHospital` / `updateHospital` mutation

Dialog max-width increased from `sm:max-w-md` → `sm:max-w-2xl` to fit the map.

---

## 6. Student Attendance — Live GPS Map

### File: `artifacts/web/src/pages/time-in.tsx` (update)

**New GPS flow (replaces simple one-shot check):**

**Page structure (new):**
```
┌────────────────────────────────────────────────────────────┐
│  Active Duty header                                         │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Live Leaflet Map — 300px tall]                     │  │
│  │   🔵 You are here       🏥 Hospital                  │  │
│  │   ──────────── route line ───────────                │  │
│  │   ○ Red/Orange/Green attendance radius circle        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Status Card:                                              │
│  🔴 Outside Attendance Zone  (or 🟡 Approaching / 🟢 Ready) │
│  Distance: 420 m  |  Radius: 100 m  |  GPS: ±8 m          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Schedule info card (existing — hospital, CI, times)        │
│  Step indicators (GPS ✅, Face ⏳)                          │
│                                                            │
│  [Start Face Verification]  ← disabled until GPS passes    │
└────────────────────────────────────────────────────────────┘
```

**Changed behavior:**
- GPS is watched continuously via `watchPosition` (real-time, not one-shot)
- "Start Verification" button is disabled until `withinRange === true`
- Clicking Start → skips the existing `gps-checking` step → jumps straight to `face-loading`
- All existing face-scan, face-verify, submit steps **unchanged**
- If hospital has no GPS set (lat/lng = 0,0) → GPS check auto-passes (existing behaviour preserved)

**Status colour logic:**
| Condition | Colour | Message |
|---|---|---|
| distance > radius × 3 | 🔴 Red | "Outside Attendance Zone" |
| distance > radius | 🟡 Orange | "Approaching — {distance}m away" |
| distance ≤ radius | 🟢 Green | "Ready for Check-In — {distance}m" |

---

## 7. File Change Summary

| File | Action | Notes |
|---|---|---|
| `lib/db/src/schema/schedules.ts` | Update | Add 4 new columns |
| `artifacts/api-server/src/routes/schedules.ts` | Update | Enrich response, new fields, recommendations endpoint |
| `artifacts/web/src/main.tsx` | Update | Import `leaflet/dist/leaflet.css` |
| `artifacts/web/src/lib/leaflet-init.ts` | **New** | Icon fix for Vite bundler |
| `artifacts/web/src/components/map-location-picker.tsx` | **New** | Hospital GPS picker |
| `artifacts/web/src/components/attendance-map.tsx` | **New** | Live GPS attendance map |
| `artifacts/web/src/pages/master-schedule.tsx` | Rewrite | Calendar view + create modal + recommendations |
| `artifacts/web/src/pages/admin-hospitals.tsx` | Update | Embed map picker in dialog |
| `artifacts/web/src/pages/time-in.tsx` | Update | Add live GPS map panel |

**No routes added to App.tsx** — all new UI is inside existing pages as modals/panels.  
**No existing features removed.**

---

## 8. Constraints & Risks

| Risk | Mitigation |
|---|---|
| Leaflet needs explicit height on `MapContainer` | Always set `style={{ height: '...' }}` |
| Leaflet marker icons broken in Vite | `leaflet-init.ts` runs icon fix once |
| Leaflet CSS must be imported globally | Added to `main.tsx` |
| Nominatim has a 1-req/sec rate limit | Debounce search input 500ms; no burst calls |
| Enriched schedule response breaks TypeScript types | Use `as unknown as EnrichedSchedule` type cast in frontend |
| `watchPosition` battery drain on mobile | Stop watching on page unmount (`clearWatch` in cleanup) |
| Calendar chip overflow | Show max 2 chips + "+N more" badge per day cell |
| Large modal (recommendations) on mobile | Dialog with internal scroll; mobile-first padding |
