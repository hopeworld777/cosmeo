import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path to the uploads directory at the project root.
// Express serves this directory statically at /uploads (see server/index.js),
// and Vite proxies /uploads/* to the backend, so a URL like
// "/uploads/filename.jpg" works in both dev (Vite proxy) and prod (Express static).
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Write files directly to disk — flat filenames, no subdirectory nesting.
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
    const rand = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    // Allow common image formats including HEIC/HEIF (default iPhone format).
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      const err = new Error("Only image files are allowed");
      err.statusCode = 400;
      cb(err);
    }
  },
});

// Wraps multer so file-filter/size errors return JSON instead of an HTML page.
function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        console.error("Upload middleware error:", err.message);
        return res.status(err.statusCode || 400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  };
}

const router = Router();

// POST /api/upload — single image
router.post("/", requireAuth, handleUpload(upload.single("image")), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// POST /api/upload/multiple — up to 5 images
router.post("/multiple", requireAuth, handleUpload(upload.array("images", 5)), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  res.json({ urls: req.files.map(f => `/uploads/${f.filename}`) });
});

export default router;
