# ClinicalFlow

A clinical scheduling and attendance management system for nursing/medical students and their clinical instructors.

## Stack

- **Monorepo:** pnpm workspaces
- **Backend:** Express.js (TypeScript) + Drizzle ORM + PostgreSQL
- **Frontend:** React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **Auth:** JWT Bearer tokens (localStorage) — cookies don't work in Replit's iframe proxy
- **Maps:** Leaflet + OpenStreetMap (no API key required)
- **Face recognition:** Luxand cloud API (enrollment stored as `luxandPersonUuid`)

## Running the App

Two workflows must be running simultaneously:

| Workflow | Command | Port |
|---|---|---|
| **API Server** | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 (console) |
| **Start application** | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/web run dev` | 5000 (webview) |

The Vite dev server proxies `/api/*` → `http://localhost:8080`.

## Required Secrets

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing key |

## Database

Schema is managed with Drizzle ORM. To push schema changes to the DB:

```bash
pnpm --filter @workspace/db run push
```

## Project Structure

```
artifacts/
  api-server/   # Express backend (src/routes, src/lib, src/middlewares)
  web/          # React frontend (src/pages, src/components, src/hooks)
  mockup-sandbox/ # UI component prototyping
lib/
  db/           # Drizzle schema + DB client
  api-spec/     # OpenAPI spec
  api-zod/      # Zod schemas shared between client & server
  api-client-react/ # TanStack Query hooks generated from spec
scripts/        # Seed script, post-merge setup
```

## Replit Setup (first-time)

These steps were run once after importing to Replit and are required if starting fresh:

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Push the Drizzle schema to the connected PostgreSQL database
pnpm --filter @workspace/db run push
```

After that, start both workflows (`API Server` and `Start application`) — they can be started from the Replit workflow panel or restarted via the shell.

Required secrets must be set in Replit's Secrets panel before the workflows will start:
- `DATABASE_URL`
- `SESSION_SECRET`

## User Preferences

- Keep existing project structure and stack — no restructuring
- pnpm only (no npm/yarn)
