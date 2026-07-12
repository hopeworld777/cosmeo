# Kosmeo (Cosmeo)

Georgia's first cosplay marketplace — a waitlist-gated platform for buying and selling cosplay costumes, props, and accessories.

## Stack

- **Frontend**: React 18 + Vite (port 5000), Tailwind CSS, Radix UI, Wouter routing, Framer Motion
- **Backend**: Express 5 (port 3001), PostgreSQL via `pg` pool, JWT auth, Multer uploads
- **Storage**: Cloudflare R2 (optional; falls back to local `uploads/` disk when R2 env vars are absent)
- **Email**: Resend (optional; logs to console when `RESEND_API_KEY` is absent)
- **i18n**: i18next — Georgian (ka) + English (en)

## Running locally

```
npm install
npm run dev
```

Vite (port 5000) proxies `/api` and `/uploads` to the Express backend (port 3001).

## Required secrets

| Secret | Purpose |
|---|---|
| `JWT_SECRET` | Signs/verifies auth tokens |
| `SESSION_SECRET` | Session signing |
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Replit's PostgreSQL module) |

## Optional secrets

| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | Transactional email (waitlist confirmations, etc.) |
| `R2_ACCOUNT_ID` | Cloudflare R2 image storage |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_BUCKET_NAME` | Cloudflare R2 |
| `PUBLIC_LAUNCH` | Set to `"true"` to disable the waitlist/invite gate |

## Database

Schema lives in `server/schema.sql`. Run it against the DB when setting up a fresh environment:

```
psql "$DATABASE_URL" -f server/schema.sql
```

## Key directories

```
server/          Express backend (routes/, middleware/, schema.sql)
src/             React frontend
src/pages/       Route-level page components
src/components/  Shared UI components
uploads/         Local image fallback (not persisted in production)
```

## User preferences

- Keep existing project structure and stack — do not restructure or migrate without asking.
