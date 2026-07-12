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

// ── Upload limits (single source of truth) ───────────────────────────────────
export const RAW_FILE_SIZE_LIMIT_MB    = 20;   // max raw file before processing
export const MAX_IMAGES_PER_LISTING   = 5;    // max files per /multiple request
export const FULL_IMAGE_MAX_WIDTH_PX  = 1600; // px — full-size WebP output
export const THUMB_MAX_WIDTH_PX       = 600;  // px — thumbnail WebP output
export const FULL_WEBP_QUALITY        = 82;
export const THUMB_WEBP_QUALITY       = 75;

// ── Storage strategy ────────────────────────────────────────────────────────
// Always buffer in memory so we can run sharp before persisting.
const useR2 = Boolean(r2);
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_RE = /jpeg|jpg|png|gif|webp|heic|heif|avif/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RAW_FILE_SIZE_LIMIT_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const extOk  = ALLOWED_RE.test(ext);
    // AVIF files may arrive as "application/octet-stream" when the OS doesn't
    // recognise the extension, so allow octet-stream when extension is cleared.
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

console.log(
  `[upload] module loaded — limits: ${RAW_FILE_SIZE_LIMIT_MB} MB raw, ` +
  `${MAX_IMAGES_PER_LISTING} images/request | useR2: ${useR2}`
);

// Wraps multer so file-filter/size errors return JSON (not an HTML error page)
// and so oversized-file errors produce a user-friendly message.
function handleUpload(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (err) {
        console.error("[upload] multer error — code:", err.code, "| message:", err.message);
        let message = err.message || "Upload failed";
        if (err.code === "LIMIT_FILE_SIZE") {
          message = `File too large. Maximum size before processing is ${RAW_FILE_SIZE_LIMIT_MB} MB.`;
        } else if (err.code === "LIMIT_FILE_COUNT") {
          message = `Too many images. Maximum ${MAX_IMAGES_PER_LISTING} per listing.`;
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
          // multer raises LIMIT_UNEXPECTED_FILE both when the field name is wrong
          // AND when too many files are sent with the correct field name.
          message = `Too many images or wrong field name. Maximum ${MAX_IMAGES_PER_LISTING} images, field must be "images".`;
        }
        return res.status(err.statusCode || 400).json({ error: message });
      }
      next();
    });
}

// ── Image processing ─────────────────────────────────────────────────────────
//
// Every upload produces two WebP files:
//   full  — max FULL_IMAGE_MAX_WIDTH_PX wide, quality FULL_WEBP_QUALITY
//   thumb — max THUMB_MAX_WIDTH_PX wide,      quality THUMB_WEBP_QUALITY
//
// Both are stored under the same base key; the thumb key is "thumb-<key>".
// getThumbUrl() in src/lib/imageUtils.js derives the thumb URL from the full
// URL at render time — no extra DB column needed.

async function processImage(inputBuffer, { maxWidth, quality }) {
  return sharp(inputBuffer)
    .rotate()                                  // auto-orient from EXIF
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 4 })              // effort 4: good speed/compression balance
    .toBuffer();
}

function makeKey() {
  return `${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;
}

// Saves one buffer to R2 or local disk with up to 2 attempts on transient failures.
async function saveBuffer(buffer, key, contentType) {
  const attempt = async () => {
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
  };

  // Retry once after 800 ms on transient R2 / network errors.
  // Local-disk writes are retried too (harmless).
  try {
    return await attempt();
  } catch (firstErr) {
    console.warn(`[upload] saveBuffer attempt 1 failed (${firstErr.message}), retrying in 800 ms…`);
    await new Promise(r => setTimeout(r, 800));
    try {
      return await attempt();
    } catch (secondErr) {
      // Surface a storage-specific message so callers can distinguish it from
      // a processing error.
      const err = new Error(
        useR2
          ? `Storage (R2) failed after 2 attempts: ${secondErr.message}`
          : `Disk write failed after 2 attempts: ${secondErr.message}`
      );
      err.cause = secondErr;
      throw err;
    }
  }
}

// Full pipeline: process → store full + thumb in parallel → return both URLs.
async function processAndSave(file) {
  let fullBuf, thumbBuf;
  try {
    [fullBuf, thumbBuf] = await Promise.all([
      processImage(file.buffer, { maxWidth: FULL_IMAGE_MAX_WIDTH_PX, quality: FULL_WEBP_QUALITY }),
      processImage(file.buffer, { maxWidth: THUMB_MAX_WIDTH_PX,      quality: THUMB_WEBP_QUALITY }),
    ]);
  } catch (err) {
    throw new Error(`Image processing failed: ${err.message}`);
  }

  const key      = makeKey();
  const fullKey  = `${key}.webp`;
  const thumbKey = `thumb-${key}.webp`;

  const origKB  = Math.round(file.buffer.length  / 1024);
  const fullKB  = Math.round(fullBuf.length       / 1024);
  const thumbKB = Math.round(thumbBuf.length      / 1024);
  console.log(
    `[upload] processed "${file.originalname}" — ` +
    `${origKB} KB raw → ${fullKB} KB full WebP + ${thumbKB} KB thumb WebP`
  );

  const [url, thumbUrl] = await Promise.all([
    saveBuffer(fullBuf,  fullKey,  "image/webp"),
    saveBuffer(thumbBuf, thumbKey, "image/webp"),
  ]);

  return { url, thumbUrl };
}

const router = Router();

// POST /api/upload — single image (avatars)
router.post("/", requireAuth, handleUpload(upload.single("image")), async (req, res) => {
  console.log("[upload] POST / — req.file:", req.file
    ? `name="${req.file.originalname}" mime="${req.file.mimetype}" size=${req.file.size}`
    : "MISSING");
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const { url, thumbUrl } = await processAndSave(req.file);
    res.json({ url, thumbUrl });
  } catch (err) {
    console.error("[upload] error:", err.message);
    const isStorageErr = err.message.startsWith("Storage") || err.message.startsWith("Disk");
    res.status(isStorageErr ? 503 : 422).json({ error: err.message });
  }
});

// POST /api/upload/multiple — up to MAX_IMAGES_PER_LISTING listing photos
router.post(
  "/multiple",
  requireAuth,
  handleUpload(upload.array("images", MAX_IMAGES_PER_LISTING)),
  async (req, res) => {
    console.log(
      "[upload] POST /multiple — req.files:", req.files?.length ?? "MISSING",
      req.files?.map(f => `"${f.originalname}"(${f.mimetype})`).join(", ") ?? ""
    );
    if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });
    try {
      const results   = await Promise.all(req.files.map(processAndSave));
      const urls      = results.map(r => r.url);
      const thumbUrls = results.map(r => r.thumbUrl);
      res.json({ urls, thumbUrls });
    } catch (err) {
      console.error("[upload] error:", err.message);
      const isStorageErr = err.message.startsWith("Storage") || err.message.startsWith("Disk");
      res.status(isStorageErr ? 503 : 422).json({ error: err.message });
    }
  }
);

export default router;
