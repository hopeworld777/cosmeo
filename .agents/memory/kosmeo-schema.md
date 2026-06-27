---
name: Kosmeo database schema
description: The DB had no tables; schema was hand-built from routes and saved to server/schema.sql
---

The database (heliumdb via DATABASE_URL) had zero tables. Schema was reverse-engineered from all server/routes/*.js files and written to `server/schema.sql`.

Tables: users, auth_tokens, listings, listing_images, favorites, conversations, messages, reviews, reports.

**Why:** No migration tool or schema file existed in the project — had to infer columns/types from SQL queries in route handlers.

**How to apply:** Run executeSql() in code_execution with the full schema SQL. Uses `CREATE TABLE IF NOT EXISTS` so safe to re-run.

Key columns to remember:
- `users`: has `is_admin`, `is_banned`, `warning_count`, `buyer_rating`, `buyer_review_count`
- `listings`: has `is_flagged`, `status` (values: 'active', 'sold', 'deleted'), `views`, `sold_at`
- `reports`: has `status` (values: 'open', 'reviewed', 'resolved', 'dismissed'), `resolution_note`, `reviewed_by`
- `reviews`: UNIQUE(listing_id, reviewer_id, review_type) — allows one review per side per listing; `review_type` is 'seller' or 'buyer'; `buyer_id` column holds the buyer being reviewed
- `favorites`: UNIQUE(user_id, listing_id) — INSERT ... ON CONFLICT DO NOTHING

**Dual-review pattern:**
- review_type='seller': buyer reviews seller → updates `users.rating` + `review_count`
- review_type='buyer': seller reviews buyer → updates `users.buyer_rating` + `buyer_review_count`
- Route order in reviews.js: GET /buyer/:userId MUST come before GET /:userId (Express route shadowing)

**Sold listing visibility:**
- `GET /api/listings/:id` now uses `status != 'deleted'` (was `is_active = true`) so sold listings remain viewable
- `GET /api/listings/user/:userId` same — returns active + sold, not deleted
