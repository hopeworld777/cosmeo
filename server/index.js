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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Kosmeo API running on port ${PORT}`);
});
