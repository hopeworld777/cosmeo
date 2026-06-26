---
name: Kosmeo database schema
description: The DB had no tables; schema was hand-built from routes and saved to server/schema.sql
---

The database (heliumdb via DATABASE_URL) had zero tables. Schema was reverse-engineered from all server/routes/*.js files and written to `server/schema.sql`.

Tables: users, auth_tokens, listings, listing_images, favorites, conversations, messages, reviews, reports.

**Why:** No migration tool or schema file existed in the project — had to infer columns/types from SQL queries in route handlers.

**How to apply:** Run `node -e "import pg from 'pg'; ..." --input-type=module` or pipe the SQL file to psql. The schema uses `CREATE TABLE IF NOT EXISTS` so it is safe to re-run.

Key columns to remember:
- `users`: has `is_admin`, `is_banned`, `warning_count` (used by reports admin actions)
- `listings`: has `is_flagged`, `status` (values: 'active', 'sold', 'deleted'), `views`
- `reports`: has `status` (values: 'open', 'reviewed', 'resolved', 'dismissed'), `resolution_note`, `reviewed_by`
- `reviews`: UNIQUE(listing_id, reviewer_id) — upsert on conflict
- `favorites`: UNIQUE(user_id, listing_id) — INSERT ... ON CONFLICT DO NOTHING
