# ClinicalFlow

A clinical rotation management system for nursing schools. Tracks student schedules, GPS + facial biometric attendance, clinical passport (case completion), duty slots, and analytics across roles: Admin, Scheduler, Clinical Instructor (CI), and Student.

## Stack

- **Backend**: Express 5 + TypeScript, session-cookie auth (`express-session`), Pino logging
- **Frontend**: React 19 + Vite 7, Wouter routing, Tailwind CSS 4, TanStack Query, Framer Motion
- **Database**: PostgreSQL + Drizzle ORM (schema-first)
- **API**: OpenAPI spec → Orval codegen → typed React hooks (`lib/api-client-react`)
- **Monorepo**: pnpm workspaces

## Running the project

Both workflows are configured and auto-start:
- **API Server** → `PORT=8080 pnpm --filter @workspace/api-server run dev`
- **ClinicalFlow Web** → `PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev`

After pulling or merging new code:
```bash
pnpm install
pnpm --filter @workspace/db run push   # apply schema changes
pnpm --filter @workspace/scripts run seed  # seed demo data (safe to re-run)
pnpm --filter @workspace/api-client-react exec tsc -p tsconfig.json  # rebuild type declarations
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

- **GPS + Facial attendance**: Students time-in via the `/schedule/:id` page. Real GPS geofencing against hospital coordinates + on-device face detection (face-api.js). Verified attendance is saved to the database.
- **Admin: manage users**: `/admin/users` — list, search, filter, deactivate users. Account creation by Admin only.
- **Clinical passport**: tracks case completions per student with CI verification.
- **Scheduling & slots**: Scheduler creates rotations; students can apply for open duty slots.
- **Analytics & audit logs**: Admin views.

## User preferences

- Keep the existing monorepo structure; do not restructure or migrate packages.
- Seed script is at `scripts/seed.ts` — run with `pnpm --filter @workspace/scripts run seed`.
