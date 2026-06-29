import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import listingsRoutes from "./routes/listings.js";
import favoritesRoutes from "./routes/favorites.js";
import messagesRoutes from "./routes/messages.js";
import uploadRoutes from "./routes/upload.js";
import walletRoutes from "./routes/wallet.js";
import reviewsRoutes from "./routes/reviews.js";
import reportsRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import { r2, streamFromR2 } from "./r2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve legacy local uploads (keeps existing listing images working)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Proxy R2 images  — GET /api/media/<key>
app.get("/api/media/{*key}", async (req, res) => {
  if (!r2) return res.status(503).json({ error: "R2 not configured" });
  const raw = req.params.key;
  const key = Array.isArray(raw) ? raw.join("/") : raw;
  try {
    await streamFromR2(key, res);
  } catch (err) {
    console.error("R2 read error:", err.message);
    res.status(404).json({ error: "Image not found" });
  }
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
