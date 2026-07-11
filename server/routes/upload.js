import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import { r2, BUCKET } from "../r2.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// ── Storage strategy ────────────────────────────────────────────────────────
const useR2 = Boolean(r2);

let storage;
if (useR2) {
  storage = multer.memoryStorage();
} else {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename:    (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
      const rand = crypto.randomBytes(12).toString("hex");
      cb(null, `${Date.now()}-${rand}${ext}`);
    },
  });
}

// ── Diagnostic: confirm which regex is active at startup ─────────────────────
const ALLOWED_RE = /jpeg|jpg|png|gif|webp|heic|heif|avif/;
console.log("[upload] module loaded — fileFilter regex:", ALLOWED_RE.toString(), "| useR2:", useR2);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const extOk  = ALLOWED_RE.test(ext);
    // AVIF files may arrive as "image/avif" or "application/octet-stream"
    // when the OS/browser doesn't recognise the extension, so allow
    // octet-stream when the extension is already cleared.
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

// Wraps multer so file-filter/size errors return JSON, not an HTML error page.
function handleUpload(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (err) {
        // Log the multer error code alongside the message so we can
        // distinguish LIMIT_FILE_SIZE / LIMIT_UNEXPECTED_FILE / fileFilter errors.
        console.error("[upload] multer error — code:", err.code, "| message:", err.message);
        return res.status(err.statusCode || 400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
}

// Uploads a single in-memory buffer to R2 and returns the proxy URL.
async function saveToR2(file) {
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const key = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`;
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        file.buffer,
    ContentType: file.mimetype,
  }));
  return `/api/media/${key}`;
}

const router = Router();

// POST /api/upload — single image
router.post("/", requireAuth, handleUpload(upload.single("image")), async (req, res) => {
  console.log("[upload] POST / — req.file:", req.file
    ? `name="${req.file.originalname}" mime="${req.file.mimetype}" size=${req.file.size}`
    : "MISSING");
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const url = useR2
      ? await saveToR2(req.file)
      : `/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    console.error("[upload] R2/disk save error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

// POST /api/upload/multiple — up to 5 images
router.post("/multiple", requireAuth, handleUpload(upload.array("images", 5)), async (req, res) => {
  console.log("[upload] POST /multiple — req.files:", req.files?.length ?? "MISSING",
    req.files?.map(f => `"${f.originalname}"(${f.mimetype})`).join(", ") ?? "");
  if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });
  try {
    const urls = useR2
      ? await Promise.all(req.files.map(saveToR2))
      : req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  } catch (err) {
    console.error("[upload] R2/disk save error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
