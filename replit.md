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

Schema lives in `server/schema.sql` (9 tables). Applied once against the Replit PostgreSQL database.

Tables: `users`, `auth_tokens`, `listings`, `listing_images`, `favorites`, `conversations`, `messages`, `reviews`, `reports`

## Environment variables

| Key | Notes |
|-----|-------|
| `DATABASE_URL` | Auto-injected by Replit — do not set manually |
| `JWT_SECRET` | Secret for signing JWT tokens (defaults to dev value if unset) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 credentials — optional; local upload fallback used if missing |
| `RESEND_API_KEY` | For transactional email via Resend — optional |

## User preferences

- Keep the existing project structure and stack
