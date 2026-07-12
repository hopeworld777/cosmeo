---
name: Chat image attachments and beta limits
description: How chat image attachments and beta upload limits are structured, for future related work.
---

- Chat images live in their own `message_attachments` table (message_id, image_url, thumb_url), never in `listing_images` — keeps listing media and chat media logically separate per product decision.
- `messages.body` is nullable (migrated via `ALTER COLUMN body DROP NOT NULL`) so an image-only message has no body; app layer requires body OR image_url at insert, not a DB constraint.
- Chat image uploads reuse the exact same `processAndSave()` pipeline as listing photos (sharp → WebP full+thumb → R2/disk) via a dedicated `/api/upload/chat-image` route — don't duplicate image processing logic for new attachment types, add a thin route that calls the existing pipeline function.
- `requireFullAccess` middleware (VIP/ADMIN gate) existed in `server/middleware/auth.js` but was unused by any route — a WAITLIST account could hit `POST /api/listings` directly and bypass the frontend gate. Now wired into listing creation; check for other similarly-defined-but-unused middleware before assuming a gate is enforced just because it exists in the codebase.
- Beta upload limits: 3 active listings/user (`is_active=true` count) and 5 images/listing, enforced both client-side (UX) and server-side (Zod `.max(5)` on images array, hardcoded `>= 3` check) — always keep both in sync when changing either number.
