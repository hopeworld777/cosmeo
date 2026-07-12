---
name: R2 uploads and image processing
description: How uploads work, R2 vs local fallback, image processing pipeline, URL conventions
---

# R2 uploads and image processing

## Rule
Every upload goes through `sharp` before storage: resize + convert to WebP + generate thumbnail. The server always produces two files per upload. The frontend derives the thumb URL from the full URL using `getThumbUrl()`.

**Why:** R2 is required for production (autoscale = ephemeral disk). Sharp runs server-side so browsers send originals (any size/format) and always get compact WebP back.

## How to apply

### Server (`server/routes/upload.js`)
- Always uses `multer.memoryStorage()` — buffer in RAM first, then process
- `processImage(buf, { maxWidth, quality })` — sharp `.rotate().resize().webp().toBuffer()`
- Full image: max 1600 px wide, WebP quality 82, key = `<ts>-<rand>.webp`
- Thumbnail: max 600 px wide, WebP quality 75, key = `thumb-<ts>-<rand>.webp`
- `saveBuffer(buf, key, contentType)` — writes to R2 (`/api/media/<key>`) or disk (`/uploads/<key>`)
- `/multiple` response: `{ urls: [fullUrl], thumbUrls: [thumbUrl] }`
- `/` (single, avatar) response: `{ url, thumbUrl }`

### R2 detection (`server/r2.js`)
- `r2` client is `null` when any of the 4 env vars is missing → local disk fallback
- Startup log: `Storage provider initialized: R2 (bucket: <name>)` OR `local disk (...)`
- Credentials trimmed defensively (stray whitespace breaks SigV4)
- Checksum opts disabled: `requestChecksumCalculation/responseChecksumValidation: "WHEN_REQUIRED"` (R2 rejects AWS SDK v3 default CRC32)

### URL conventions
- R2 full:  `/api/media/<ts>-<rand>.webp`
- R2 thumb: `/api/media/thumb-<ts>-<rand>.webp`
- Local full:  `/uploads/<ts>-<rand>.webp`
- Local thumb: `/uploads/thumb-<ts>-<rand>.webp`
- `getThumbUrl(url)` in `src/lib/imageUtils.js` derives thumb from full: `url.replace(/\/([^/]+)$/, "/thumb-$1")`

### Frontend thumbnail usage
- **Thumbnail contexts** (listing cards, profile lists, admin tables): `getThumbUrl(images[0])`
  - `src/components/ListingCard.jsx` — `imageSrc = getThumbUrl(listing.images?.[0])`
  - `src/pages/Home.jsx` — featured spotlight cards
  - `src/pages/Profile.jsx` — active + sold listing lists
  - `src/pages/AdminDashboard.jsx` — moderation + listing tables
- **Full image context** (detail hero): `images[0]` directly — `src/pages/ItemDetail.jsx`

### DB storage
- `listing_images.image_url` stores the full URL only; thumb is derived at render time
- No schema change needed — naming convention handles both

## Compression results (real test)
- Input: 7 072 KB JPEG
- Full WebP 1600 px: 113 KB  (98.4 % smaller)
- Thumb WebP 600 px: 23 KB   (99.7 % smaller)

## multer limit
Raw upload limit raised to 20 MB (sharp compresses before storage).
Frontend `MAX_LISTING_BYTES` in `imageUtils.js` also raised to 20 MB to match.
