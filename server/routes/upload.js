import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { uploadToR2, streamFromR2, r2 } from "../r2.js";

const memStorage = multer.memoryStorage();

const upload = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    // Includes heic/heif since that's the default photo format on iPhones —
    // rejecting it here used to throw synchronously and produce an HTML
    // error page instead of JSON, which silently broke uploads client-side.
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error("Only image files are allowed");
      err.statusCode = 400;
      cb(err);
    }
  },
});

// Wraps a multer middleware so file-filter/size errors thrown during parsing
// (which multer surfaces via next(err), not a normal throw) return JSON
// instead of falling through to Express's default HTML error page — the
// frontend always expects `res.json()` to succeed.
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

function makeKey(file) {
  const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
  const rand = crypto.randomBytes(12).toString("hex");
  return `uploads/${Date.now()}-${rand}${ext}`;
}

const router = Router();

// POST /api/upload  — single image
router.post("/", requireAuth, handleUpload(upload.single("image")), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const key = makeKey(req.file);
    const url = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

// POST /api/upload/multiple  — up to 5 images
router.post("/multiple", requireAuth, handleUpload(upload.array("images", 5)), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  try {
    const urls = await Promise.all(
      req.files.map(f => uploadToR2(f.buffer, makeKey(f), f.mimetype))
    );
    res.json({ urls });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
