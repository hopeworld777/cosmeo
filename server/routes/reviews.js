import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/reviews/:userId — fetch all reviews for a seller
router.get("/:userId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.username as reviewer_username, u.avatar_url as reviewer_avatar,
             l.title as listing_title
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      LEFT JOIN listings l ON l.id = r.listing_id
      WHERE r.seller_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Reviews fetch error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /api/reviews — submit a review
router.post("/", requireAuth, async (req, res) => {
  const { listing_id, seller_id, rating, comment } = req.body;

  if (!seller_id) return res.status(400).json({ error: "seller_id required" });
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be 1–5" });
  if (Number(seller_id) === req.userId) return res.status(400).json({ error: "Cannot review yourself" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert review (one review per listing per reviewer)
    const reviewRes = await client.query(`
      INSERT INTO reviews (listing_id, reviewer_id, seller_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (listing_id, reviewer_id)
        DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
      RETURNING *
    `, [listing_id || null, req.userId, seller_id, rating, comment || null]);

    // Recalculate seller's average rating + review count
    const stats = await client.query(`
      SELECT ROUND(AVG(rating)::numeric, 2) as avg_rating, COUNT(*) as total
      FROM reviews WHERE seller_id = $1
    `, [seller_id]);

    const { avg_rating, total } = stats.rows[0];
    await client.query(
      "UPDATE users SET rating = $1, review_count = $2 WHERE id = $3",
      [avg_rating, total, seller_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      review: reviewRes.rows[0],
      seller_rating: Number(avg_rating),
      seller_review_count: Number(total),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to submit review" });
  } finally {
    client.release();
  }
});

export default router;
