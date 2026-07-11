import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import listingsRoutes from "./routes/listings.js";
import favoritesRoutes from "./routes/favorites.js";
import messagesRoutes from "./routes/messages.js";
import uploadRoutes from "./routes/upload.js";
import walletRoutes from "./routes/wallet.js";
import reviewsRoutes from "./routes/reviews.js";
import reportsRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import notificationsRoutes from "./routes/notifications.js";
import waitlistRoutes from "./routes/waitlist.js";
import { r2, streamFromR2 } from "./r2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve legacy local uploads (keeps existing listing images working)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve uploaded images — GET /api/media/<key>
// Priority: R2 bucket (when credentials are set) → local uploads/ fallback.
// The local fallback keeps images working in dev workspaces without R2 and
// recovers gracefully if R2 credentials are removed after images were uploaded.
app.get("/api/media/{*key}", async (req, res) => {
  const raw = req.params.key;
  const key = Array.isArray(raw) ? raw.join("/") : raw;

  // 1. Try R2 when configured
  if (r2) {
    try {
      await streamFromR2(key, res);
      return;
    } catch (err) {
      console.error("R2 read error:", err.message);
      // Headers not yet sent — fall through to local disk
      if (res.headersSent) return res.end();
    }
  }

  // 2. Local disk fallback — resolve safely under the uploads directory
  //    The key typically looks like "uploads/1234-abc.jpg", so the resolved
  //    path becomes <project-root>/uploads/uploads/1234-abc.jpg which is
  //    exactly where uploadToR2's local fallback writes the file.
  const uploadsRoot = path.resolve(__dirname, "..", "uploads");
  const localPath   = path.resolve(uploadsRoot, key);

  // Guard against path-traversal attempts
  if (!localPath.startsWith(uploadsRoot + path.sep) && localPath !== uploadsRoot) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    await fs.promises.access(localPath, fs.constants.R_OK);
    return res.sendFile(localPath);
  } catch {
    return res.status(404).json({ error: "Image not found" });
  }
});

// ── Waitlist gate ─────────────────────────────────────────────────────────────
// Pre-launch: every API route except auth, waitlist, health, and the media
// proxy requires a valid JWT. Unauthenticated requests to any other endpoint
// receive 403 immediately, so even direct curl/fetch calls can't bypass the
// frontend gate and pull real data.
// /api/media/* is registered above this block and never reaches this middleware.
const WAITLIST_GATE_PUBLIC = ["/auth", "/waitlist", "/health", "/media"];
app.use("/api", (req, res, next) => {
  const isPublic = WAITLIST_GATE_PUBLIC.some(
    p => req.path === p || req.path.startsWith(p + "/")
  );
  if (isPublic) return next();
  return requireAuth(req, res, next);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/notifications", notificationsRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// In production, serve the built Vite frontend and handle client-side routing
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cosmeo API running on port ${PORT}`);
});
