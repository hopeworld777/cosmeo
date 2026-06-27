import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/reviews/buyer/:userId — fetch buyer reviews (seller rated this user as buyer)
// Must be defined BEFORE /:userId to avoid Express shadowing
router.get("/buyer/:userId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.username as reviewer_username, u.avatar_url as reviewer_avatar,
             l.title as listing_title, l.id as listing_id
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      LEFT JOIN listings l ON l.id = r.listing_id
      WHERE r.buyer_id = $1 AND r.review_type = 'buyer'
      ORDER BY r.created_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Buyer reviews fetch error:", err);
    res.status(500).json({ error: "Failed to fetch buyer reviews" });
  }
});

// GET /api/reviews/:userId — fetch seller reviews for a user
router.get("/:userId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.username as reviewer_username, u.avatar_url as reviewer_avatar,
             l.title as listing_title, l.id as listing_id
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      LEFT JOIN listings l ON l.id = r.listing_id
      WHERE r.seller_id = $1 AND r.review_type = 'seller'
      ORDER BY r.created_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Seller reviews fetch error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /api/reviews — submit a review (seller or buyer)
router.post("/", requireAuth, async (req, res) => {
  const { listing_id, seller_id, buyer_id, rating, comment, review_type = "seller" } = req.body;

  if (!["seller", "buyer"].includes(review_type)) {
    return res.status(400).json({ error: "review_type must be 'seller' or 'buyer'" });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be 1–5" });
  }

  // For seller reviews: reviewer (buyer) rates the seller
  // For buyer reviews: reviewer (seller) rates the buyer
  if (review_type === "seller") {
    if (!seller_id) return res.status(400).json({ error: "seller_id required" });
    if (Number(seller_id) === req.userId) return res.status(400).json({ error: "Cannot review yourself" });
  } else {
    if (!buyer_id) return res.status(400).json({ error: "buyer_id required" });
    if (Number(buyer_id) === req.userId) return res.status(400).json({ error: "Cannot review yourself" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (review_type === "seller") {
      // Buyer reviews seller
      const reviewRes = await client.query(`
        INSERT INTO reviews (listing_id, reviewer_id, seller_id, buyer_id, rating, comment, review_type)
        VALUES ($1, $2, $3, NULL, $4, $5, 'seller')
        ON CONFLICT (listing_id, reviewer_id, review_type)
          DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
        RETURNING *
      `, [listing_id || null, req.userId, seller_id, rating, comment || null]);

      // Recalculate seller's average rating
      const stats = await client.query(`
        SELECT ROUND(AVG(rating)::numeric, 2) as avg_rating, COUNT(*) as total
        FROM reviews WHERE seller_id = $1 AND review_type = 'seller'
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
    } else {
      // Seller reviews buyer
      const reviewRes = await client.query(`
        INSERT INTO reviews (listing_id, reviewer_id, seller_id, buyer_id, rating, comment, review_type)
        VALUES ($1, $2, $2, $3, $4, $5, 'buyer')
        ON CONFLICT (listing_id, reviewer_id, review_type)
          DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
        RETURNING *
      `, [listing_id || null, req.userId, buyer_id, rating, comment || null]);

      // Recalculate buyer's average buyer_rating
      const stats = await client.query(`
        SELECT ROUND(AVG(rating)::numeric, 2) as avg_rating, COUNT(*) as total
        FROM reviews WHERE buyer_id = $1 AND review_type = 'buyer'
      `, [buyer_id]);
      const { avg_rating, total } = stats.rows[0];
      await client.query(
        "UPDATE users SET buyer_rating = $1, buyer_review_count = $2 WHERE id = $3",
        [avg_rating, total, buyer_id]
      );

      await client.query("COMMIT");
      res.status(201).json({
        review: reviewRes.rows[0],
        buyer_rating: Number(avg_rating),
        buyer_review_count: Number(total),
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to submit review" });
  } finally {
    client.release();
  }
});

export default router;
