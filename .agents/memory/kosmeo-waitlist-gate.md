---
name: Kosmeo beta/waitlist access gate
description: How the invite-only beta gate blocks anonymous API reads and the client-side redirect race it can cause on deep links.
---

- Server-side (`server/index.js`): a global `/api` middleware requires `requireAuth` + `requireFullAccess` for every route except `/auth`, `/waitlist`, `/health`, `/config`, `/media`. `PUBLIC_LAUNCH=true` only relaxes the VIP/ADMIN access_status check inside `requireFullAccess` — it does **not** remove the JWT requirement. So even at "public launch," anonymous (no-token) GETs to things like `/api/listings/:id` still 401. Routes using `optionalAuth` internally (e.g. listing detail) are still gated before they're ever reached.
- Client-side (`AuthContext`/`WaitlistGate` in `App.jsx`): `waitlistEnabled` defaults to `true` (fail-closed) until `/api/config` resolves. `AuthContext` now also exposes `configLoaded`, and `WaitlistGate`'s redirect effect waits on it.
  **Why:** without waiting for `configLoaded`, a deep link (e.g. `/item/42`) mounted with the default `waitlistEnabled=true` and got redirected to `/`, then redirected again to `/home` once the real (false) flag arrived — bouncing guests off direct listing links even when the beta was technically open. Always gate this kind of "flag defaults closed until fetched" redirect logic on the fetch's own loaded state, not just unrelated auth loading.
- For manual/agent testing of pages behind this gate: no seeded demo accounts exist. Register a throw-away user via `POST /api/auth/register`, elevate `access_status='VIP'` directly in Postgres, then log in as that user through the normal UI/token flow. Don't leave the test user or flipped `access_status` behind — clean up after verifying.
