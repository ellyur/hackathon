# ClinicalFlow — Bug Fixes

## 1. Sign-In Does Nothing (Critical)

**Symptom:** Clicking "Sign In" sends credentials, the API returns HTTP 200, but the user stays on the login page and `/api/auth/me` immediately returns 401.

**Root cause:** The login route sets `req.session.userId` and `req.session.role`, then calls `res.json()` without waiting for `session.save()`. `express-session` persists the session asynchronously; if the response is sent before the session write completes, the browser receives a `Set-Cookie` header pointing to a session ID that doesn't exist in the store yet. The very next request (`/api/auth/me`) therefore finds no session and returns 401.

**Fix:** Call `req.session.save()` explicitly and await it before sending the JSON response.

**File:** `artifacts/api-server/src/routes/auth.ts`

---

## 2. "Live Auth" Floating Widget (UI clutter)

**Symptom:** A floating `<select>` in the bottom-right corner lets you switch between mock roles (Admin, Scheduler, CI, Student). It shows on any `.replit.dev` hostname regardless of mode.

**Root cause:** `DevRoleSwitcher` in `artifacts/web/src/components/dev-role-switcher.tsx` is mounted unconditionally in `App.tsx`. It was only meant for development without a real backend.

**Fix:** Remove `<DevRoleSwitcher />` and its import from `App.tsx`. The component file can stay but is no longer used.

**File:** `artifacts/web/src/App.tsx`

---

## 3. Demo Credentials Cards on Login Page (UI clutter)

**Symptom:** Login page shows a footer with four credential buttons (Student, Instructor, Scheduler, Admin) and the plain-text password "password123".

**Fix:** Remove the `CardFooter` block and the `fillCredential` helper from `login.tsx`. Also remove the unused `CardFooter` import.

**File:** `artifacts/web/src/pages/login.tsx`

---

## 4. "Set Up Now" / Camera / Create Schedule Buttons Not Working

**Symptom:** Buttons that navigate to protected pages (face setup, schedule creation, etc.) appear to do nothing or redirect back to login.

**Root cause:** All protected routes are guarded by `ProtectedRoute`, which redirects to `/login` when `/api/auth/me` returns 401. Because issue #1 means the user is never actually authenticated, every click on a protected-page button bounces back to login — making it look like the buttons are broken.

**Fix:** Resolved by fixing issue #1. Once the session persists correctly, `ProtectedRoute` will pass and all real page components (FaceSetupPage, CreateSchedulePage, etc.) will render.

**Note:** Several routes intentionally render `<PlaceholderPage>` (Notification Center, Attendance History, My Applications, Verify Student Case, Manage Announcements, Manage Hospitals, Clinical Cases Library, etc.). These are acknowledged stubs, not bugs.

---

## 5. Blank Page After Login in Replit Preview (Critical)

**Symptom:** After the session save fix, login returns HTTP 200 in curl but the browser preview still shows a blank white page. The `SameSite` issue.

**Root cause:** Two layered problems:
1. The session cookie had no `SameSite` attribute, so browsers default to `SameSite=Lax`. The Replit preview pane is an **iframe** on `replit.com` embedding `*.replit.dev` — a cross-site context. `SameSite=Lax` cookies are blocked in cross-site iframes by modern browsers (Chrome, Firefox, Safari). The browser silently drops the session cookie, so every request to `/api/auth/me` returns 401 regardless of a successful login.
2. Setting `secure: true` on the cookie is required by `SameSite=None`, but Express then checks `req.secure` before sending the `Set-Cookie` header. Behind Replit's HTTPS proxy, `req.secure` is `false` because the server only sees HTTP internally. Without `app.set('trust proxy', 1)`, Express never set the cookie at all.

**Fix:**
- `session.ts`: detect `REPL_ID` env var (always set on Replit) → use `sameSite: 'none', secure: true`
- `app.ts`: add `app.set('trust proxy', 1)` so Express trusts the `X-Forwarded-Proto: https` header from Replit's proxy and sets `req.secure = true`

**Files:** `artifacts/api-server/src/lib/session.ts`, `artifacts/api-server/src/app.ts`

---

## Changes Summary

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/auth.ts` | Add `session.save()` before `res.json()` in login handler |
| `artifacts/api-server/src/lib/session.ts` | Set `SameSite=None; Secure` when running on Replit |
| `artifacts/api-server/src/app.ts` | Add `trust proxy` so `req.secure` reflects the HTTPS proxy |
| `artifacts/web/src/App.tsx` | Remove `DevRoleSwitcher` import and usage |
| `artifacts/web/src/pages/login.tsx` | Remove demo credentials footer and `fillCredential` helper |
