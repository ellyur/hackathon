# ClinicalFlow

A nursing school clinical rotation management system. Handles student scheduling, GPS-geofenced attendance, facial recognition check-in, and a "clinical passport" for tracking student progress. Built as a TypeScript pnpm monorepo.

## Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Wouter (routing), TanStack Query, Framer Motion
- **Backend**: Express 5, Node.js, express-session (cookie auth), Pino logging
- **Database**: PostgreSQL with Drizzle ORM
- **API**: OpenAPI spec → Orval codegen for typed React hooks (`lib/api-client-react`)

## How to Run

Two workflows must be running (started via the Run button or Replit workflow panel):

| Workflow | Command | Port |
|---|---|---|
| **API Server** | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |
| **Web** | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/web run dev` | 5000 |

The Vite dev server proxies `/api/*` → `localhost:8080`.

## First-Time Setup

```bash
pnpm install
pnpm --filter @workspace/db run push   # apply schema
pnpm --filter @workspace/scripts run seed  # seed test data
```

## Test Accounts (password: `password123`)

| Email | Role |
|---|---|
| admin@clinicalflow.com | Admin |
| scheduler@clinicalflow.com | Scheduler |
| ci@clinicalflow.com | Clinical Instructor |
| student@clinicalflow.com | Student |

## Environment Secrets

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session cookie signing key |

## Project Structure

```
artifacts/
  api-server/   Express backend
  web/          React + Vite frontend
lib/
  db/           Drizzle schema & migrations
  api-spec/     OpenAPI definitions & Orval config
  api-client-react/  Generated React Query hooks
  api-zod/      Shared Zod schemas
scripts/        seed.ts and utilities
```

## User Preferences

- Keep the existing monorepo structure and stack — do not restructure or migrate.
