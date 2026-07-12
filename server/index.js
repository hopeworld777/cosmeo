import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import { requireAuth, requireFullAccess } from "./middleware/auth.js";
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

// Trust the first proxy hop (Replit's reverse proxy / load-balancer).
// Required so express-rate-limit can correctly read X-Forwarded-For
// instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

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

// ── Invite-only beta gate ─────────────────────────────────────────────────────
// Every API route except auth, waitlist, health, config, and the media proxy
// requires both a valid JWT AND full access (VIP/ADMIN access_status) — a
// WAITLIST account can log in but gets a clean 403 from every other endpoint,
// so even direct curl/fetch calls can't bypass the frontend gate and pull
// real data. Set PUBLIC_LAUNCH=true to drop the access_status check for
// everyone once Cosmeo goes public (see requireFullAccess).
// /api/media/* is registered above this block and never reaches this middleware.
const PUBLIC_API_PREFIXES = ["/auth", "/waitlist", "/health", "/config", "/media"];
app.use("/api", (req, res, next) => {
  const isPublic = PUBLIC_API_PREFIXES.some(
    p => req.path === p || req.path.startsWith(p + "/")
  );
  if (isPublic) return next();
  return requireAuth(req, res, () => requireFullAccess(req, res, next));
});

// GET /api/config — public, tiny flag the frontend uses to know whether the
// invite-only waitlist gate is currently enforced. Flip PUBLIC_LAUNCH=true
// at launch time to open the app to everyone without touching this code.
app.get("/api/config", (req, res) => {
  res.json({ waitlistEnabled: process.env.PUBLIC_LAUNCH !== "true" });
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

// Serve the built Vite frontend whenever dist/ exists (production deployments).
// Checking for the file is more reliable than NODE_ENV which can be unset.
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(path.join(distPath, "index.html"))) {
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cosmeo API running on port ${PORT}`);
});
