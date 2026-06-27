---
name: Cosmeo stack
description: Full-stack architecture, auth, image uploads, and DB schema for the Cosmeo cosplay marketplace (formerly Kosmeo)
---

# Cosmeo Full-Stack Architecture

## Ports & Proxy
- Frontend: Vite on port 5000 (workflow: "Start application")
- Backend: Express on port 3001 (workflow: "Backend API", command: `node server/index.js`)
- Vite proxies `/api/*` and `/uploads/*` to `http://localhost:3001`

## Auth
- JWT with `jsonwebtoken`, bcrypt with `bcryptjs`
- Token stored in `localStorage` as `kosmeo_token`
- `JWT_SECRET` env var (defaults to dev secret)
- `src/context/AuthContext.jsx` provides `useAuth()` hook
- `src/lib/api.js` auto-injects `Authorization: Bearer <token>` header

## Image Uploads
- Multer stores files in `./uploads/` directory at project root
- Express serves `/uploads/*` as static files
- `POST /api/upload` (single) and `POST /api/upload/multiple` (up to 5)
- Returns relative URL like `/uploads/filename.jpg`

## DB Schema Tables
- `users` — id, username, email, password_hash, bio, avatar_url, location, rating, review_count, sales_count, balance
- `listings` — id, seller_id (FK users), title, description, price, rent_price, is_for_rent, is_for_sale, category, fandom, character, size, condition, views, is_active
- `listing_images` — id, listing_id (FK listings), image_url, sort_order
- `favorites` — id, user_id, listing_id (UNIQUE pair)
- `conversations` — id, listing_id, buyer_id, seller_id (UNIQUE listing+buyer)
- `messages` — id, conversation_id, sender_id, recipient_id, body, is_read

## API Field Names (differ from old mock data)
- `is_for_rent`, `is_for_sale`, `rent_price` (not camelCase)
- `seller_username`, `seller_avatar`, `seller_rating` (joined from users)
- `images` — array of URL strings from listing_images (may be null if no images)
- `favorited_count` — comes as string from SQL COUNT, coerce with parseInt if needed

## Seed Accounts (password: kosmeo123)
- star@kosmeo.com (StarForge, id=1)
- crystal@kosmeo.com (CrystalCrafter, id=2)
- neon@kosmeo.com (NeonBlade, id=3)

**Why:** All of this is not derivable from code alone; the port split and proxy config are easy to forget when debugging.
