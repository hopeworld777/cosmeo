import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { requireAuth } from "../middleware/auth.js";
import { r2, BUCKET } from "../r2.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// ── Storage strategy ────────────────────────────────────────────────────────
// Always buffer in memory so we can process with sharp before persisting.
// Local-disk path writes processed buffers to UPLOADS_DIR after processing;
// R2 path uploads the processed buffer directly to the bucket.
const useR2 = Boolean(r2);
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB raw (will be compressed to <~1 MB)
  fileFilter: (_req, file, cb) => {
    const ALLOWED_RE = /jpeg|jpg|png|gif|webp|heic|heif|avif/;
    const ext    = path.extname(file.originalname).toLowerCase();
    const extOk  = ALLOWED_RE.test(ext);
    const mimeOk = ALLOWED_RE.test(file.mimetype) || file.mimetype === "application/octet-stream";

    console.log(`[upload] fileFilter — name:"${file.originalname}" ext:"${ext}" mime:"${file.mimetype}" extOk:${extOk} mimeOk:${mimeOk}`);

    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      const err = new Error("Unsupported format. Please upload a JPG, PNG, WEBP, AVIF, or GIF.");
      err.statusCode = 400;
      cb(err);
    }
  },
});

console.log("[upload] module loaded — fileFilter regex: /jpeg|jpg|png|gif|webp|heic|heif|avif/ | useR2:", useR2);

// Wraps multer so file-filter/size errors return JSON, not an HTML error page.
function handleUpload(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (err) {
        console.error("[upload] multer error — code:", err.code, "| message:", err.message);
        return res.status(err.statusCode || 400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
}

// ── Image processing ─────────────────────────────────────────────────────────
//
// Every image goes through two sharp passes before storage:
//
//   full  — max 1600 px wide, WebP quality 82, auto-rotated from EXIF.
//            Used by ItemDetail hero and as the canonical stored URL.
//
//   thumb — max 600 px wide (wide enough for 3:4 cards at 2× DPR), WebP q 75.
//            Key is prefixed with "thumb-" so the frontend can derive it from
//            the full URL without a separate DB column: getThumbUrl(url) in
//            src/lib/imageUtils.js strips the last path segment and re-prefixes.
//
// Both are stored to R2 (or local disk) and the endpoint returns
//   { urls: [fullUrl], thumbUrls: [thumbUrl] }
// for /multiple, and
//   { url: fullUrl, thumbUrl: thumbUrl }
// for /single.  Existing callers that only read .urls[0] continue to work.

async function processImage(inputBuffer, { maxWidth, quality = 80 }) {
  return sharp(inputBuffer)
    .rotate()                             // auto-orient from EXIF before anything else
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 4 })         // effort 4 = good speed/compression balance
    .toBuffer();
}

// Generates a unique base key (no extension — caller appends .webp).
function makeKey() {
  return `${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;
}

// Saves a buffer to R2 or local disk; returns the URL the frontend should use.
async function saveBuffer(buffer, key, contentType) {
  if (useR2) {
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return `/api/media/${key}`;
  } else {
    const destPath = path.join(UPLOADS_DIR, key);
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.writeFile(destPath, buffer);
    return `/uploads/${key}`;
  }
}

// Full pipeline for one file: process → store full + thumb → return both URLs.
async function processAndSave(file) {
  const key = makeKey();
  const fullKey  = `${key}.webp`;
  const thumbKey = `thumb-${key}.webp`;

  const [fullBuf, thumbBuf] = await Promise.all([
    processImage(file.buffer, { maxWidth: 1600, quality: 82 }),
    processImage(file.buffer, { maxWidth:  600, quality: 75  }),
  ]);

  const origBytes = file.buffer.length;
  const fullBytes = fullBuf.length;
  console.log(
    `[upload] processed "${file.originalname}" — ` +
    `original: ${(origBytes / 1024).toFixed(0)} KB → ` +
    `full: ${(fullBytes / 1024).toFixed(0)} KB WebP — ` +
    `thumb: ${(thumbBuf.length / 1024).toFixed(0)} KB WebP`
  );

  const [url, thumbUrl] = await Promise.all([
    saveBuffer(fullBuf,  fullKey,  "image/webp"),
    saveBuffer(thumbBuf, thumbKey, "image/webp"),
  ]);

  return { url, thumbUrl };
}

const router = Router();

// POST /api/upload — single image (used for avatars)
router.post("/", requireAuth, handleUpload(upload.single("image")), async (req, res) => {
  console.log("[upload] POST / — req.file:", req.file
    ? `name="${req.file.originalname}" mime="${req.file.mimetype}" size=${req.file.size}`
    : "MISSING");
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const { url, thumbUrl } = await processAndSave(req.file);
    res.json({ url, thumbUrl });
  } catch (err) {
    console.error("[upload] processing/save error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

// POST /api/upload/multiple — up to 5 images (used for listing photos)
router.post("/multiple", requireAuth, handleUpload(upload.array("images", 5)), async (req, res) => {
  console.log("[upload] POST /multiple — req.files:", req.files?.length ?? "MISSING",
    req.files?.map(f => `"${f.originalname}"(${f.mimetype})`).join(", ") ?? "");
  if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });
  try {
    const results  = await Promise.all(req.files.map(processAndSave));
    const urls     = results.map(r => r.url);
    const thumbUrls = results.map(r => r.thumbUrl);
    res.json({ urls, thumbUrls });
  } catch (err) {
    console.error("[upload] processing/save error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
