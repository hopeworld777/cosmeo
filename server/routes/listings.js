import { Router } from "express";
import pool from "../db.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/listings
router.get("/", optionalAuth, async (req, res) => {
  const { search, category, filter, limit = 20, offset = 0 } = req.query;
  try {
    let conditions = ["l.is_active = true"];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(l.title ILIKE $${idx} OR l.fandom ILIKE $${idx} OR l.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`l.category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (filter === "Rentals") {
      conditions.push("l.is_for_rent = true");
    } else if (filter === "For Sale") {
      conditions.push("l.is_for_sale = true");
    } else if (filter === "Under $50") {
      conditions.push("l.price < 50");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT l.*, 
             u.username as seller_username, u.avatar_url as seller_avatar, u.rating as seller_rating,
             u.review_count as seller_review_count, u.location as seller_location,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      JOIN users u ON u.id = l.seller_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("List listings error:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET /api/listings/trending
router.get("/trending", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, 
             u.username as seller_username, u.avatar_url as seller_avatar, u.rating as seller_rating,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      JOIN users u ON u.id = l.seller_id
      WHERE l.is_active = true
      ORDER BY favorited_count DESC, l.views DESC, l.created_at DESC
      LIMIT 8
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Trending error:", err);
    res.status(500).json({ error: "Failed to fetch trending" });
  }
});

// GET /api/listings/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*,
             u.username as seller_username, u.avatar_url as seller_avatar, u.rating as seller_rating,
             u.review_count as seller_review_count, u.bio as seller_bio, u.sales_count as seller_sales,
             u.location as seller_location,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      JOIN users u ON u.id = l.seller_id
      WHERE l.id = $1 AND l.is_active = true
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ error: "Listing not found" });

    // Increment view count
    await pool.query("UPDATE listings SET views = views + 1 WHERE id = $1", [req.params.id]);

    // Check if current user has favorited
    let isFavorited = false;
    if (req.userId) {
      const fav = await pool.query(
        "SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2",
        [req.userId, req.params.id]
      );
      isFavorited = fav.rows.length > 0;
    }

    res.json({ ...result.rows[0], is_favorited: isFavorited });
  } catch (err) {
    console.error("Get listing error:", err);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// POST /api/listings
router.post("/", requireAuth, async (req, res) => {
  const {
    title, description, price, rent_price, is_for_rent, is_for_sale,
    category, fandom, character, size, condition, images
  } = req.body;

  if (!title || !description || !category || !condition || !size) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!is_for_rent && !is_for_sale) {
    return res.status(400).json({ error: "Must be for sale or rent" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const listingResult = await client.query(
      `INSERT INTO listings (seller_id, title, description, price, rent_price, is_for_rent, is_for_sale, category, fandom, character, size, condition)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [req.userId, title, description, price || null, rent_price || null,
       is_for_rent || false, is_for_sale || true, category, fandom || "", character || "", size, condition]
    );
    const listing = listingResult.rows[0];

    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await client.query(
          "INSERT INTO listing_images (listing_id, image_url, sort_order) VALUES ($1, $2, $3)",
          [listing.id, images[i], i]
        );
      }
    }

    await client.query("UPDATE users SET sales_count = sales_count + 1 WHERE id = $1", [req.userId]);
    await client.query("COMMIT");

    const full = await pool.query(`
      SELECT l.*, u.username as seller_username,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images
      FROM listings l JOIN users u ON u.id = l.seller_id WHERE l.id = $1
    `, [listing.id]);

    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create listing error:", err);
    res.status(500).json({ error: "Failed to create listing" });
  } finally {
    client.release();
  }
});

// DELETE /api/listings/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE listings SET is_active = false WHERE id = $1 AND seller_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found or not authorized" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete listing error:", err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// GET /api/listings/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      WHERE l.seller_id = $1 AND l.is_active = true
      ORDER BY l.created_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("User listings error:", err);
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
});

export default router;
