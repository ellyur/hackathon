---
name: Orval Params Type Collision
description: When Orval generates both Zod schema and TS types with the same Params name, causing re-export collision in api-zod
---

## The Problem
When an OpenAPI endpoint has BOTH path parameters AND query parameters, Orval generates:
1. A `GetXxxParams` Zod schema in `generated/api.ts` (for path params)
2. A `GetXxxParams` TypeScript interface in `generated/types/` (for query params)

When `lib/api-zod/src/index.ts` does `export * from "./generated/api"` AND `export * from "./generated/types"`, TypeScript throws TS2308 "module has already exported a member".

## The Fix
Move the path parameter to a query parameter so there are no path params → Orval only generates `GetXxxQueryParams` in types, no collision.

**Example:** Changed `/recommendations/{studentId}/explanation` (path param `studentId` + query params `scheduleId`, `slotId`) → `/recommendations/explanation` (all query params including `studentId`).

**Why:** Endpoints with ONLY path params: Orval generates `GetXxxParams` Zod schema but no TS query-params interface. Endpoints with ONLY query params: Orval generates `GetXxxParams` TS interface but no Zod path-params schema. The collision only happens when BOTH exist simultaneously.

**How to apply:** When adding new endpoints with mixed path+query params, watch for this collision. Either rename the operationId or restructure to avoid mixing both param types.
