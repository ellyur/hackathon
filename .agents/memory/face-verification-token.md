---
name: Face verification token pattern
description: Server-issued one-time token prevents biometric bypass at time-in
---

## Pattern
POST /attendance/verify-face → on success → randomUUID stored in module-level Map {userId, expiresAt: now+5min} → returns {verified:true, verificationToken}
POST /attendance/time-in → validates Map entry (exists, not expired, userId === session.userId) → deletes token (one-time) → sets faceVerified:true in DB

**Why:** Without this, any student could POST time-in directly with faceVerified:true and skip Luxand entirely (broken access enforcement).

**How to apply:** Token store is faceVerificationTokens Map in artifacts/api-server/src/routes/attendance.ts, pruned every 10 min via setInterval(...).unref(). Not persisted across restarts — acceptable since TTL is 5 min and restarts clear sessions anyway.
