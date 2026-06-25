import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/favorites
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, 
             u.username as seller_username, u.avatar_url as seller_avatar,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM favorites f
      JOIN listings l ON l.id = f.listing_id
      JOIN users u ON u.id = l.seller_id
      WHERE f.user_id = $1 AND l.is_active = true
      ORDER BY f.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// POST /api/favorites
router.post("/", requireAuth, async (req, res) => {
  const { listing_id } = req.body;
  if (!listing_id) return res.status(400).json({ error: "listing_id required" });
  try {
    await pool.query(
      "INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.userId, listing_id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

// DELETE /api/favorites/:listingId
router.delete("/:listingId", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2",
      [req.userId, req.params.listingId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
