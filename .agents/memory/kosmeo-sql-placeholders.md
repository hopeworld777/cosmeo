---
name: SQL template literal placeholder bug pattern
description: Recurring bug where dynamic pg placeholders in template-literal SQL lose their leading $, causing "bind message supplies N parameters, but prepared statement requires 0" errors.
---

In `server/routes/*.js`, paginated/filtered queries build SQL with JS template
literals and dynamic parameter indices, e.g. `` `LIMIT $${idx} OFFSET $${idx + 1}` ``.
It's easy to accidentally write `` `LIMIT ${idx} OFFSET ${idx + 1}` `` (missing one `$`),
which produces a query with a literal number instead of a `$1`-style placeholder.
Postgres then throws `bind message supplies N parameters, but prepared statement "" requires 0`.

**Why:** This exact bug appeared independently in both `listings.js` (GET /) and
`admin.js` (GET /users) in the same session — it's a natural typo when writing
`$${idx}`, and it fails silently until the route is actually hit (no build-time error).

**How to apply:** After writing or editing any query that mixes conditional
`ILIKE`/`=` placeholders with a trailing `LIMIT $n OFFSET $n+1`, grep the file for
`${idx}` (bad) vs `$${idx}` (good) and curl the endpoint directly to confirm it
returns data instead of a 500, before considering the change done.
