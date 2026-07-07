---
name: ClinicalFlow architecture
description: Auth approach, frontend/backend wiring, and Replit-specific cookie gotchas
---

# ClinicalFlow Architecture

## Auth — switched to JWT (localStorage + Bearer header)

**Why cookies fail on Replit:** The Replit IDE preview pane is an iframe on `replit.com` embedding `*.replit.dev`. Chrome blocks third-party cookies in iframes even with `SameSite=None; Secure`. Every cookie-based session attempt returns 401 on `/api/auth/me` immediately after a successful login.

**Fix:** Switched to JWT tokens stored in `localStorage`, sent via `Authorization: Bearer <token>` on every request.

**How it works:**
- Backend: `artifacts/api-server/src/lib/jwt.ts` — `signToken` / `verifyToken` using `SESSION_SECRET`
- Backend: `artifacts/api-server/src/routes/auth.ts` login handler signs a token and returns `{ ...userProfile, token }`
- Backend: `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` checks Bearer token first, session cookie second
- Frontend: `artifacts/web/src/hooks/use-auth.ts` calls `setAuthTokenGetter(() => localStorage.getItem('authToken'))` at module load so every fetch carries the token
- Frontend: `artifacts/web/src/pages/login.tsx` stores `data.token` in localStorage and calls `setAuthTokenGetter` after successful login
- Frontend: logout clears `localStorage.removeItem('authToken')` and calls `setAuthTokenGetter(null)`

**Additional Replit proxy notes (now moot but kept for reference):**
- Replit's internal proxy does NOT forward `X-Forwarded-Proto: https` to backend services
- `app.set('trust proxy', 1)` alone is not enough for secure cookies
- A middleware injecting the header works for curl but Chrome still blocks the cross-site cookie

## OpenAPI / codegen note

- `allOf` schemas in `openapi.yaml` can cause TypeScript naming conflicts in `lib/api-zod` when the same name is exported from both `generated/api.ts` (Zod schema) and `generated/types.ts` (TS type). Workaround: add optional fields directly to the existing schema instead of creating a new `allOf` schema.
- `token` was added as optional field to `AuthUser` schema (only populated by login response, not by `getMe`)

## Frontend auth hook

`artifacts/web/src/hooks/use-auth.ts` supports two modes:
1. Real JWT auth (token in localStorage)
2. Mock mode (mockRole in localStorage, for dev without backend — still present but DevRoleSwitcher UI removed)

## Dev role switcher

`DevRoleSwitcher` component exists but is no longer mounted in `App.tsx` — removed as requested.
Demo credentials footer was removed from `login.tsx`.
