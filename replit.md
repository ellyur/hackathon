# ClinicalFlow

Smart Clinical Rotation Management Platform for nursing and allied health programs.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui (port 5000)
- **Backend:** Express 5 + Drizzle ORM + PostgreSQL (port 8080)
- **Auth:** JWT Bearer tokens stored in localStorage
- **Biometrics:** Luxand cloud face recognition (enrollment stored as `luxandPersonUuid`)
- **Monorepo:** pnpm workspaces

## Project structure

```
artifacts/
  api-server/   Express API server
  web/          React + Vite frontend
lib/
  api-client-react/   Generated React Query hooks (orval)
  api-spec/           OpenAPI spec + orval config
  api-zod/            Zod schemas shared between client and server
  db/                 Drizzle schema + PostgreSQL client
```

## Running locally

Both workflows must be running:

| Workflow | Command | Port |
|---|---|---|
| API Server | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |
| Start application | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/web run dev` | 5000 |

Install dependencies first: `pnpm install`

## Required secrets

| Secret | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |

## Notes

- JWT is used for auth (not cookies) because Replit's iframe proxy breaks cookie-based sessions
- Any endpoint with BOTH path params AND query params needs special handling due to orval param collision (see `.agents/memory/orval-params-collision.md`)

## User preferences

- Keep existing project structure and stack
