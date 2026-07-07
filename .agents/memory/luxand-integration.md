---
name: Luxand face recognition integration
description: How Luxand.cloud replaces client-side face-api.js for ClinicalFlow attendance
---

## Architecture
- Enrollment: frontend captures JPEG → POST /api/students/me/face-enroll (base64) → server calls Luxand createPerson + addPhotoToPerson → stores UUID in student_profiles.luxand_person_uuid
- Verification: frontend captures JPEG → POST /api/attendance/verify-face (base64) → server calls Luxand photo/search → checks UUID match with MIN_FACE_CONFIDENCE=0.7 → returns one-time verificationToken
- Time-in: client passes faceVerificationToken (never a bare boolean flag) → server validates before insert

**Why:** face-api.js required downloading large ML model files and ran in-browser, causing a blank-page crash on /profile/face-setup. Luxand moves all ML to the cloud; frontend becomes a simple camera capture.

**How to apply:** Luxand helpers in artifacts/api-server/src/lib/luxand.ts. Token stored as LUXAND_API_TOKEN Replit Secret. DB column: student_profiles.luxand_person_uuid (text).
