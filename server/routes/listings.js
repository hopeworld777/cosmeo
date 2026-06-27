import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

// ── Zod schema for creating a listing ─────────────────────────────────────────
const createListingSchema = z.object({
  title:       z.string().min(5,  "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category:    z.enum(["outfit", "wig", "shoes", "prop", "crafting"], {
    errorMap: () => ({ message: "Select a valid category" }),
  }),
  is_for_sale: z.boolean(),
  is_for_rent: z.boolean(),
  price:       z.number().positive("Sale price must be greater than 0").nullable().optional(),
  rent_price:  z.number().positive("Rental price must be greater than 0").nullable().optional(),
  fandom:      z.string().optional().default(""),
  size:        z.string().optional().default(""),
  condition:   z.string().optional().default(""),
  images:      z.array(z.string().url()).optional().default([]),
})
  .refine(d => d.is_for_sale || d.is_for_rent, {
    message: "Must be listed for sale or for rent (or both)",
  })
  .refine(d => !d.is_for_sale || (d.price != null && d.price > 0), {
    message: "Sale price required when listing for sale",
    path: ["price"],
  })
  .refine(d => !d.is_for_rent || (d.rent_price != null && d.rent_price > 0), {
    message: "Daily rental price required when listing for rent",
    path: ["rent_price"],
  });

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

// GET /api/listings/me — seller's own listings (all statuses)
// MUST be defined before /:id so Express does not shadow it
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      WHERE l.seller_id = $1 AND l.status != 'deleted'
      ORDER BY l.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("My listings error:", err);
    res.status(500).json({ error: "Failed to fetch your listings" });
  }
});

// GET /api/listings/:id/buyers — users who messaged about this listing (potential buyers)
// Must be before /:id to avoid Express shadowing
router.get("/:id/buyers", requireAuth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ error: "Listing not found" });
  }
  try {
    // Only the seller can fetch this
    const listing = await pool.query("SELECT seller_id FROM listings WHERE id = $1", [req.params.id]);
    if (!listing.rows[0] || listing.rows[0].seller_id !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.avatar_url
      FROM conversations c
      JOIN users u ON u.id = c.buyer_id
      WHERE c.listing_id = $1 AND c.buyer_id != $2
      ORDER BY u.username
    `, [req.params.id, req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Listing buyers error:", err);
    res.status(500).json({ error: "Failed to fetch buyers" });
  }
});

// GET /api/listings/:id
router.get("/:id", optionalAuth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ error: "Listing not found" });
  }
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
      WHERE l.id = $1 AND l.status != 'deleted'
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
  // Email verification gate — enforced server-side so the frontend cannot be bypassed
  const verifyCheck = await pool.query(
    "SELECT email_verified FROM users WHERE id = $1",
    [req.userId]
  );
  if (!verifyCheck.rows[0]?.email_verified) {
    return res.status(403).json({ error: "email_not_verified" });
  }

  // Active listing limit — max 3 per user (sold/deleted/inactive don't count)
  const countResult = await pool.query(
    "SELECT COUNT(*) FROM listings WHERE seller_id = $1 AND is_active = true",
    [req.userId]
  );
  if (parseInt(countResult.rows[0].count, 10) >= 3) {
    return res.status(403).json({ error: "listing_limit_reached" });
  }

  // Zod validation
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return res.status(400).json({ error: first.message, details: parsed.error.errors });
  }

  const {
    title, description, price, rent_price, is_for_rent, is_for_sale,
    category, fandom, size, condition, images,
  } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const listingResult = await client.query(
      `INSERT INTO listings
         (seller_id, title, description, price, rent_price, is_for_rent, is_for_sale,
          category, fandom, size, condition)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.userId, title, description,
       is_for_sale ? price : null,
       is_for_rent ? rent_price : null,
       is_for_rent, is_for_sale,
       category, fandom, size, condition]
    );
    const listing = listingResult.rows[0];

    // Insert images (placeholder already included by the client when no upload)
    for (let i = 0; i < images.length; i++) {
      await client.query(
        "INSERT INTO listing_images (listing_id, image_url, sort_order) VALUES ($1, $2, $3)",
        [listing.id, images[i], i]
      );
    }

    await client.query("COMMIT");

    const full = await pool.query(`
      SELECT l.*, u.username as seller_username, u.location as seller_location,
             u.rating as seller_rating, u.review_count as seller_review_count,
             (SELECT json_agg(image_url ORDER BY sort_order)
              FROM listing_images WHERE listing_id = l.id) as images
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

// PATCH /api/listings/:id/sold — mark listing as sold
router.patch("/:id/sold", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE listings SET status = 'sold', is_active = false, sold_at = NOW() WHERE id = $1 AND seller_id = $2 RETURNING id, status, sold_at",
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found or not authorized" });
    res.json({ success: true, status: "sold" });
  } catch (err) {
    console.error("Mark sold error:", err);
    res.status(500).json({ error: "Failed to mark as sold" });
  }
});

// PATCH /api/listings/:id/available — revert sold listing back to active
router.patch("/:id/available", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE listings SET status = 'active', is_active = true WHERE id = $1 AND seller_id = $2 RETURNING id, status",
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found or not authorized" });
    res.json({ success: true, status: "active" });
  } catch (err) {
    console.error("Mark available error:", err);
    res.status(500).json({ error: "Failed to mark as available" });
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
      WHERE l.seller_id = $1 AND l.status != 'deleted'
      ORDER BY l.created_at DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("User listings error:", err);
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
});

export default router;
