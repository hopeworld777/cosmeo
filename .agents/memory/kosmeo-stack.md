---
name: Cosmeo/Kosmeo stack
description: Stack layout, ports, storage, and setup quirks for the Kosmeo cosplay-marketplace app
---

Express 3001 + Vite 5000, pg pool, JWT auth, multer uploads; Vite proxies /api and /uploads to backend; localStorage keys still use "kosmeo_*" prefix (internal only).

## Fresh-import setup
When this repo is freshly imported/cloned, `npm install` is needed (node_modules absent → `concurrently: command not found`), the Postgres schema must be loaded manually (`psql "$DATABASE_URL" -f server/schema.sql` — no relations exist on a fresh DB), and `JWT_SECRET` must be set (falls back to an insecure hardcoded dev value in `server/middleware/auth.js` if absent — generate and set a random one rather than leaving the fallback). `SESSION_SECRET` and `DATABASE_URL` are Replit-managed and present automatically. R2 and Resend are optional — app degrades gracefully to local disk uploads and console-logged emails when absent.
