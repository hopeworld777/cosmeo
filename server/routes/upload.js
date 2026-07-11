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
// Decided once at startup based on whether R2 credentials are present.
//
//   R2 configured  → memoryStorage (bytes handed to R2 PutObject)
//                    URLs returned: /api/media/<key>   (served by Express proxy)
//
//   R2 absent      → diskStorage   (written flat to project-root uploads/)
//                    URLs returned: /uploads/<filename> (served by Express static)
//
// This means local dev keeps working without any credentials, and production
// automatically switches to R2 with no code changes needed.

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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extOk  = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      const err = new Error("Only image files are allowed");
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
        console.error("Upload middleware error:", err.message);
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
  // /api/media/<key> is handled by the Express proxy route in server/index.js
  // which streams the bytes from R2 back to the client.
  return `/api/media/${key}`;
}

const router = Router();

// POST /api/upload — single image
router.post("/", requireAuth, handleUpload(upload.single("image")), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const url = useR2
      ? await saveToR2(req.file)
      : `/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

// POST /api/upload/multiple — up to 5 images
router.post("/multiple", requireAuth, handleUpload(upload.array("images", 5)), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });
  try {
    const urls = useR2
      ? await Promise.all(req.files.map(saveToR2))
      : req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
