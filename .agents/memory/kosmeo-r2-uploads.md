---
name: R2 uploads and image processing
description: How uploads work, R2 vs local fallback, image processing pipeline, URL conventions, deletion, limits, cleanup
---

# R2 uploads and image processing

## Rule
Every upload goes through `sharp` before storage: resize + convert to WebP + generate thumbnail. The server always produces two files per upload. The frontend derives the thumb URL from the full URL using `getThumbUrl()`. Images are deleted from R2 when a listing is soft-deleted.

**Why:** R2 is required for production (autoscale = ephemeral disk). Sharp runs server-side so browsers send originals (any size/format) and always get compact WebP back.

---

## Server (`server/routes/upload.js`)

### Limits (single source of truth in upload.js constants)
- `RAW_FILE_SIZE_LIMIT_MB = 20` — max raw file before processing (multer limit)
- `MAX_IMAGES_PER_LISTING = 5` — max files per `/multiple` request (multer array limit)
- Error codes: `LIMIT_FILE_SIZE` → friendly message; `LIMIT_FILE_COUNT` / `LIMIT_UNEXPECTED_FILE` → friendly message naming the limit
- HTTP 400 for format/count errors; HTTP 503 for storage failures; HTTP 422 for processing failures

### Processing pipeline
- `processImage(buf, { maxWidth, quality })` — sharp `.rotate().resize().webp().toBuffer()`
- Full: max 1600 px wide, WebP q82 → key = `<ts>-<rand>.webp`
- Thumb: max 600 px wide, WebP q75 → key = `thumb-<ts>-<rand>.webp`
- Both stored in parallel via `Promise.all`

### Retry logic for R2 saves
- `saveBuffer()` tries up to 2 attempts with 800 ms delay between them
- On second failure, throws with a message starting "Storage (R2) failed…" (HTTP 503) vs "Image processing failed…" (HTTP 422) so callers can distinguish transient storage errors from corrupt-file errors

---

## server/r2.js exports

| Export | Purpose |
|---|---|
| `r2` | S3Client (null if R2 vars missing) |
| `BUCKET` | R2 bucket name |
| `uploadToR2(buf, key, mime)` | Raw upload used by avatar route (no sharp) |
| `streamFromR2(key, res)` | Stream object to HTTP response |
| `deleteFromStorage(url)` | Delete full + thumb by URL; never throws |
| `listAllStorageKeys()` | Paginated list of all keys (for cleanup) |

### `deleteFromStorage(url)`
- Accepts `/api/media/<key>` (R2) or `/uploads/<key>` (local disk)
- Deletes both `<key>` and `thumb-<key>` from the same storage
- Silently logs errors but never re-throws — safe for fire-and-forget

### R2 credentials quirks
- All 4 env vars trimmed defensively (stray whitespace breaks SigV4)
- `requestChecksumCalculation/responseChecksumValidation: "WHEN_REQUIRED"` — R2 rejects AWS SDK v3 default CRC32

---

## Image deletion on listing delete (`server/routes/listings.js`)

When `DELETE /api/listings/:id` is called:
1. Fetch all `listing_images.image_url` for that listing (ownership-checked via JOIN)
2. Soft-delete the listing (`is_active = false`)
3. Fire-and-forget `deleteFromStorage()` for each URL (both full + thumb deleted)
4. Respond immediately — storage errors are logged but never block the user's action

---

## Admin orphan cleanup (`POST /api/admin/storage/cleanup`)

`server/routes/admin.js` — requires admin JWT.

- **Dry-run** (default, pass `{}`): lists orphan keys, no deletions
- **Live run** (`{ "confirm": true }`): deletes all orphaned objects
- Logic: lists all storage keys → queries all `listing_images.image_url` → deletes keys not referenced
- Thumbs are implicitly protected: `thumb-<key>` is marked referenced whenever `<key>` is

Response fields: `dryRun`, `totalStorageObjects`, `referencedObjects`, `orphanCount`, `orphanKeys` (preview, max 50), `deleted`, `failed`.

**Note on automatic cleanup:** R2 lifecycle rules (Cloudflare dashboard → bucket → settings → "Lifecycle") can auto-expire objects after N days as an alternative. The admin endpoint is the on-demand manual option.

---

## URL conventions

| Type | Pattern |
|---|---|
| R2 full | `/api/media/<ts>-<rand>.webp` |
| R2 thumb | `/api/media/thumb-<ts>-<rand>.webp` |
| Local full | `/uploads/<ts>-<rand>.webp` |
| Local thumb | `/uploads/thumb-<ts>-<rand>.webp` |

`getThumbUrl(url)` in `src/lib/imageUtils.js` — inserts `thumb-` before the last path segment.

---

## Frontend thumbnail usage

| Context | File | Uses |
|---|---|---|
| Listing grid cards | `ListingCard.jsx` | `getThumbUrl(images[0])` |
| Spotlight carousel | `Home.jsx` | `getThumbUrl(images[0])` |
| Profile active/sold lists | `Profile.jsx` | `getThumbUrl(images[0])` |
| Admin moderation/listing tables | `AdminDashboard.jsx` | `getThumbUrl(images[0])` |
| Item detail hero | `ItemDetail.jsx` | `images[0]` (full) |

---

## Shimmer loading placeholders

`ListingCard` and `ItemDetail` both use the same pattern:
- `useState(false)` for `imgLoaded` / `heroLoaded` (must be at top of component, before any early returns)
- `opacity-0` on `<img>` while loading → `opacity-100` on `onLoad`
- `absolute inset-0 animate-pulse bg-muted` overlay removed when loaded
- `onError` also sets loaded=true (removes shimmer, triggers fallback placeholder)
- Shimmer div placed after the fallback div in DOM so `nextElementSibling` targeting in `onError` still works

---

## multer limit

Raw upload limit: 20 MB. Frontend `MAX_LISTING_BYTES` in `imageUtils.js` also 20 MB.

## Compression results (real test)
- Input: 7 072 KB JPEG
- Full WebP 1600 px: ~113 KB (98 % smaller)
- Thumb WebP 600 px: ~23 KB (99 % smaller)

## Env var changes require a workflow restart — Node doesn't hot-reload `process.env`
`useR2`/`r2` in `r2.js` and the DB pool's connection string are computed once at process start. If `DATABASE_URL`, `R2_*`, or similar secrets are added/changed while the server is already running, that process keeps using the old values (old DB, local-disk fallback) even though newer values show up in a fresh shell — this looks exactly like "listing created fine but image doesn't display" because the image was saved wherever the *stale* process pointed (e.g. ephemeral local disk that doesn't survive a restart), while later checks query the *new* DB/bucket and find nothing.
**Why:** discovered debugging a real "image doesn't display" regression — `/proc/<pid>/environ` showed the running server on the old DB host while a fresh shell already had the new one.
**How to apply:** any time secrets tied to storage/DB config change, restart the workflow before doing further debugging or QA, and check `/proc/<pid>/environ` (or just the startup log lines like "Storage provider initialized: ...") if something seems inconsistent between what you observe from a shell and what the app is doing.
