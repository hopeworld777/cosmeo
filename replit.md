# Cosmeo

A cosplay marketplace (formerly Kosmeo) where users can buy, sell, and rent cosplay costumes, collectibles, props, accessories, and handmade items.

## Stack

- **Frontend:** React 18 + Vite 5 (port 5000), Tailwind CSS, Radix UI, Wouter routing
- **Backend:** Express 5 (port 3001), JWT auth, Multer uploads
- **Database:** PostgreSQL via Replit's managed DB (`pg` pool, `DATABASE_URL` auto-injected)
- **Image storage:** Cloudflare R2 (optional — falls back to local `./uploads/`)
- **i18n:** react-i18next (English + Georgian)

## Running the project

```
npm run dev
```

Starts both servers concurrently:
- Vite frontend at port 5000 (proxies `/api/*` and `/uploads/*` → backend)
- Express backend at port 3001

## Database

Schema lives in `server/schema.sql`. Applied once against the Replit PostgreSQL database (safe to re-run — every statement is idempotent).

Tables: `users`, `auth_tokens`, `listings`, `listing_images`, `favorites`, `conversations`, `messages`, `reviews`, `reports`, `notifications`, `waitlist`, `invite_codes`

## Invite-only beta access

Every account has `users.access_status`: `WAITLIST` (default), `VIP`, or `ADMIN`.
- Only `VIP`/`ADMIN` accounts get full app access — everyone else (including a
  logged-in `WAITLIST` account) sees the waitlist landing page, and the
  backend's `/api` gate (`server/index.js` + `requireFullAccess` in
  `server/middleware/auth.js`) returns 403 `waitlist_pending` for every other
  endpoint, so it can't be bypassed by calling the API directly.
- Reusable invite links live at `/invite/<code>`, e.g. `/invite/COSMEOBETA`
  (seeded by default). Visiting a valid one stashes the code for the normal
  `/register` form, which then creates the account with `access_status = VIP`.
  An invalid code just falls through to a normal (waitlist) signup — no error
  is shown, so codes can't be probed from the outside.
- Codes are rows in `invite_codes` (`code`, `is_active`). Add or deactivate
  more directly in the database — there's no admin UI for this yet, by
  design (single reusable link per invite wave, no per-user codes, no
  referral tracking).
- **Launch switch:** set `PUBLIC_LAUNCH=true` (env var) to lift the gate for
  everyone — `/api/config` reports `waitlistEnabled: false` and both the
  frontend gates and `requireFullAccess` stop checking `access_status`. No
  code change or migration needed at that point.
- Note: existing accounts created before this system default to `WAITLIST`
  on migration (except accounts with `is_admin = true`, which became
  `ADMIN`). Promote any pre-existing testers by hand if they should keep
  full access: `UPDATE users SET access_status = 'VIP' WHERE email = '...'`.

## Environment variables

| Key | Notes |
|-----|-------|
| `DATABASE_URL` | Auto-injected by Replit — do not set manually |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `CLIENT_URL` | Frontend base URL used in email links — defaults to `https://www.cosmeo.shop` if unset |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 credentials — optional; local upload fallback used if missing |
| `RESEND_API_KEY` | For transactional email via Resend — optional |

## Render deployment

Add the following environment variables in the Render dashboard under **Environment**:

```
CLIENT_URL=https://www.cosmeo.shop
```

This ensures verification and password-reset emails contain links to the production domain instead of localhost.

## User preferences

- Keep the existing project structure and stack
