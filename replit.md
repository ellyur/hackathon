# ClinicalFlow

A clinical rotation management system for nursing schools. Tracks student schedules, GPS + facial biometric attendance, clinical passport (case completion), duty slots, and analytics across roles: Admin, Scheduler, Clinical Instructor (CI), and Student.

## Stack

- **Backend**: Express 5 + TypeScript, session-cookie auth (`express-session`), Pino logging
- **Frontend**: React 19 + Vite 7, Wouter routing, Tailwind CSS 4, TanStack Query, Framer Motion
- **Database**: PostgreSQL + Drizzle ORM (schema-first)
- **API**: OpenAPI spec → Orval codegen → typed React hooks (`lib/api-client-react`)
- **Monorepo**: pnpm workspaces

## ⚠️ First-time setup after importing to Replit

Run these in order in the Shell before doing anything else:

```bash
# 1. Install all dependencies (node_modules are not committed)
pnpm install

# 2. Push the database schema
pnpm --filter @workspace/db run push

# 3. Seed demo accounts and test data
pnpm --filter @workspace/scripts run seed

# 4. Rebuild the API client type declarations
pnpm --filter @workspace/api-client-react exec tsc -p tsconfig.json
```

Then set these Secrets (sidebar → Secrets):
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — any random string, e.g. `openssl rand -hex 32`

### Preview not showing / blank white screen

The Replit artifact system registers the workflows automatically once the project is opened. If the preview is blank:

1. **Wait for artifact registration** — Replit detects `artifacts/*/` directories and registers them as managed workflows (`artifacts/web: web`, `artifacts/api-server: API Server`). This happens automatically when you first open the repl.

2. **Start both managed workflows** using the Run button or manually:
   - `artifacts/web: web` → runs Vite on port 22333 (artifact router handles preview at `/`)
   - `artifacts/api-server: API Server` → runs Express on port 8080 (preview at `/api`)

3. **Port conflict on 8080** — if the API Server workflow fails with `EADDRINUSE: address already in use 0.0.0.0:8080`, a stale process is still holding the port. Kill it:
   ```bash
   lsof -ti:8080 | xargs kill -9
   ```
   Then restart the `artifacts/api-server: API Server` workflow.

4. **Do NOT add `[[ports]]` to `.replit`** — the artifact application router handles all port forwarding. Adding `[[ports]]` entries causes a partial-mapping conflict that breaks the preview.

5. **Do NOT create manual workflows** for the web or API server — the managed artifact workflows (`artifacts/web: web`, `artifacts/api-server: API Server`) already inject the correct `PORT` and `BASE_PATH` from `artifact.toml`. Duplicate manual workflows on different ports will conflict.

## Running the project

Workflows auto-start via the Run button (configured in `.replit`):
- `artifacts/web: web` → Vite dev server on port 22333, preview at `/`
- `artifacts/api-server: API Server` → Express on port 8080, preview at `/api`

After pulling or merging new code:
```bash
pnpm install
pnpm --filter @workspace/db run push        # apply schema changes
pnpm --filter @workspace/scripts run seed   # re-seed if needed (safe to re-run)
pnpm run --filter @workspace/api-spec codegen  # regenerate API hooks after OpenAPI changes
```

## Environment variables / secrets

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing key |

## Seeded test accounts (password: `password123`)

| Email | Role |
|---|---|
| admin@clinicalflow.com | Admin |
| scheduler@clinicalflow.com | Scheduler |
| ci@clinicalflow.com | Clinical Instructor |
| student@clinicalflow.com | Student |

## Key features

- **Face enrollment**: Students register their face at `/profile/face-setup` before their first time-in. Uses face-api.js (TinyFaceDetector + FaceRecognitionNet) entirely on-device.
- **GPS + Facial attendance**: Students time-in via the `/schedule/:id` page. Real GPS geofencing against hospital coordinates + euclidean distance face match (threshold 0.55) against enrolled descriptor. Verified attendance saved to DB.
- **Admin: manage users**: `/admin/users` — list, search, filter, deactivate users. Account creation by Admin only.
- **Clinical passport**: tracks case completions per student with CI verification.
- **Scheduling & slots**: Scheduler creates rotations; students can apply for open duty slots.
- **Analytics & audit logs**: Admin views.

## User preferences

- Keep the existing monorepo structure; do not restructure or migrate packages.
- Seed script is at `scripts/seed.ts` — run with `pnpm --filter @workspace/scripts run seed`.
