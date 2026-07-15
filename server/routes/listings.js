import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth, requireFullAccess, optionalAuth } from "../middleware/auth.js";
import { deleteFromStorage } from "../r2.js";
import { validateListingTitle } from "../../shared/titleValidation.js";

// ── Zod schema for creating a listing ─────────────────────────────────────────
const RENTAL_DURATIONS = ["1_day", "3_days", "1_week", "custom"];
const DELIVERY_METHODS  = ["pickup", "shipping", "both"];
const INCLUDED_ITEM_OPTIONS = ["costume", "wig", "shoes", "props", "armor", "accessories", "other"];

const createListingSchema = z.object({
  title:       z.string().superRefine((val, ctx) => {
    const error = validateListingTitle(val);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category:    z.enum(["outfit", "wig", "shoes", "prop", "crafting", "accessories", "collectibles"], {
    errorMap: () => ({ message: "Select a valid category" }),
  }),
  is_for_sale: z.boolean(),
  is_for_rent: z.boolean(),
  price:       z.number().positive("Sale price must be greater than 0").nullable().optional(),
  rent_price:  z.number().positive("Rental price must be greater than 0").nullable().optional(),
  fandom:      z.string().optional().default(""),
  brand:       z.string().max(255, "Brand must be 255 characters or fewer").optional().default(""),
  size:        z.string().optional().default(""),
  condition:   z.string().optional().default(""),
  location:    z.string().max(150, "Location must be 150 characters or fewer").optional().default(""),
  // Upload URLs are intentionally *relative* (e.g. "/api/media/uploads/xxx.jpg"
  // or "/uploads/xxx.jpg") — the frontend proxy (Vite) and the Express static/
  // media routes only work same-origin, so an absolute URL would actually be
  // wrong here. z.string().url() rejects relative paths, which made every
  // listing submission fail validation despite uploads succeeding. Accept
  // either a relative path starting with "/" or a full absolute URL (in case
  // R2 is ever served from its own public domain).
  images: z.array(
    z.string().refine(
      (v) => v.startsWith("/") || /^https?:\/\//.test(v),
      { message: "Invalid image URL" }
    )
  ).min(1, "At least one image is required")
   .max(5, "Maximum 5 images per listing"),

  // ── Rental-specific fields ──────────────────────────────────────────────
  // All optional at the type level; enforced conditionally on is_for_rent
  // via the .refine() calls below so sale/commission listings are unaffected.
  deposit_amount:         z.number().positive("Security deposit must be greater than 0").nullable().optional(),
  rental_duration:        z.enum(RENTAL_DURATIONS).nullable().optional(),
  rental_duration_custom: z.string().max(100).optional().default(""),
  height_range:           z.string().max(100).optional().default(""),
  measurements:           z.string().optional().default(""),
  shoe_size:              z.string().max(20).optional().default(""),
  included_items:         z.array(z.enum(INCLUDED_ITEM_OPTIONS)).optional().default([]),
  care_instructions:      z.string().optional().default(""),
  delivery_method:        z.enum(DELIVERY_METHODS).nullable().optional(),
  damage_policy:          z.string().optional().default(""),
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
  })
  .refine(d => !d.is_for_rent || (d.deposit_amount != null && d.deposit_amount > 0), {
    message: "Refundable security deposit is required for rental listings",
    path: ["deposit_amount"],
  })
  .refine(d => !d.is_for_rent || !!d.rental_duration, {
    message: "Rental duration is required for rental listings",
    path: ["rental_duration"],
  })
  .refine(d => !d.is_for_rent || d.rental_duration !== "custom" || d.rental_duration_custom.trim().length > 0, {
    message: "Please specify the custom rental duration",
    path: ["rental_duration_custom"],
  })
  .refine(d => !d.is_for_rent || !!d.delivery_method, {
    message: "Please select a pickup/shipping option for rental listings",
    path: ["delivery_method"],
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
             u.is_verified as seller_is_verified,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      JOIN users u ON u.id = l.seller_id
      ${where}
      ORDER BY l.is_featured DESC, l.created_at DESC
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
             u.is_verified as seller_is_verified,
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
             u.location as seller_location, u.is_verified as seller_is_verified,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      JOIN users u ON u.id = l.seller_id
      WHERE l.id = $1 AND l.status != 'deleted'
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ error: "Listing not found" });

    // [image-debug] see matching note in POST / — traces the same listing's
    // image field on every subsequent read, so a "broken on view" report can
    // be compared directly against the create-time log line.
    console.log(
      `[image-debug] listing=${result.rows[0].id} step=get-detail ` +
      `db_images=${JSON.stringify(result.rows[0].images)}`
    );

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
// requireFullAccess closes a gap where a WAITLIST account (blocked from the
// Sell page by the frontend route guard, but never checked server-side)
// could call this endpoint directly and create a listing. The beta VIP
// listing limit below only makes sense once this gate is in place — without
// it, "each VIP user can create max 3" isn't actually VIP-scoped, it's
// "each authenticated user".
router.post("/", requireAuth, requireFullAccess, async (req, res) => {
  // Email verification gate — enforced server-side so the frontend cannot be bypassed
  const verifyCheck = await pool.query(
    "SELECT email_verified FROM users WHERE id = $1",
    [req.userId]
  );
  if (!verifyCheck.rows[0]?.email_verified) {
    return res.status(403).json({ error: "email_not_verified" });
  }

  // Beta VIP listing limit — max 3 active listings per user (sold/deleted/
  // inactive listings don't count against it). This is a temporary beta
  // constraint on testers, not a permanent product limit — see
  // listingLimitTitle/Body in the translation files for the user-facing
  // copy. ADMIN accounts are exempt: the cap exists to bound how much beta
  // testers can list, not to restrict the site's own operator/owner, and
  // admin is supposed to be a strict superset of VIP, never a more
  // restricted role.
  const accessCheck = await pool.query("SELECT access_status FROM users WHERE id = $1", [req.userId]);
  if (accessCheck.rows[0]?.access_status !== "ADMIN") {
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM listings WHERE seller_id = $1 AND is_active = true",
      [req.userId]
    );
    if (parseInt(countResult.rows[0].count, 10) >= 3) {
      return res.status(403).json({ error: "listing_limit_reached" });
    }
  }

  // Zod validation
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return res.status(400).json({ error: first.message, details: parsed.error.errors });
  }

  const {
    title, description, price, rent_price, is_for_rent, is_for_sale,
    category, fandom, brand, size, condition, images, location,
    deposit_amount, rental_duration, rental_duration_custom,
    height_range, measurements, shoe_size, included_items,
    care_instructions, delivery_method, damage_policy,
  } = parsed.data;

  // Reject listings whose image URLs point to temporary local disk storage.
  // /uploads/ paths are written by the local-disk fallback when R2 is not
  // configured; those files are wiped on every container restart and must
  // never be persisted to the database.  A client that reaches this check
  // has bypassed the frontend guard (stale session, direct API call, etc.).
  const staleImages = images.filter(url => url.startsWith("/uploads/"));
  if (staleImages.length > 0) {
    return res.status(400).json({
      error: "One or more image URLs point to temporary local storage (/uploads/). Please re-upload those photos and try again.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Rental-only fields are only ever persisted when is_for_rent is true —
    // sale/commission listings always get NULL/empty here regardless of what
    // was in the request body, so toggling "for rent" off and back on later
    // can't resurrect stale rental data from an earlier submission shape.
    const listingResult = await client.query(
      `INSERT INTO listings
         (seller_id, title, description, price, rent_price, is_for_rent, is_for_sale,
          category, fandom, brand, size, condition, location,
          deposit_amount, rental_duration, rental_duration_custom,
          height_range, measurements, shoe_size, included_items,
          care_instructions, delivery_method, damage_policy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
               $14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [req.userId, title, description,
       is_for_sale ? price : null,
       is_for_rent ? rent_price : null,
       is_for_rent, is_for_sale,
       category, fandom, brand, size, condition, location,
       is_for_rent ? deposit_amount : null,
       is_for_rent ? rental_duration : null,
       is_for_rent && rental_duration === "custom" ? rental_duration_custom : null,
       is_for_rent ? (height_range || null) : null,
       is_for_rent ? (measurements || null) : null,
       is_for_rent ? (shoe_size || null) : null,
       is_for_rent ? included_items : [],
       is_for_rent ? (care_instructions || null) : null,
       is_for_rent ? delivery_method : null,
       is_for_rent ? (damage_policy || null) : null]
    );
    const listing = listingResult.rows[0];

    // Insert images
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

    // [image-debug] Trace the image URL end to end: what the client sent →
    // what got persisted in listing_images → what the create response hands
    // back. Left in place (cheap, one-line) so a future "images broken"
    // report can be diagnosed from logs alone instead of ad-hoc DB queries.
    console.log(
      `[image-debug] listing=${listing.id} step=create ` +
      `received_from_client=${JSON.stringify(images)} ` +
      `returned_in_response=${JSON.stringify(full.rows[0].images)}`
    );

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
    // 1. Fetch image URLs before soft-deleting so we can clean up storage.
    //    The JOIN ensures we only read images for listings this seller owns.
    const imgRows = await pool.query(
      `SELECT li.image_url
       FROM listing_images li
       JOIN listings l ON l.id = li.listing_id
       WHERE l.id = $1 AND l.seller_id = $2`,
      [req.params.id, req.userId]
    );

    // 2. Soft-delete the listing. status='deleted' is what /listings/me and
    //    the single-listing GET actually filter on (`status != 'deleted'`),
    //    so it must be set here too — is_active alone left deleted listings
    //    reappearing in the seller's own profile on the next refetch.
    const result = await pool.query(
      "UPDATE listings SET is_active = false, status = 'deleted' WHERE id = $1 AND seller_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found or not authorized" });

    // 3. Respond immediately, then delete storage objects in the background.
    //    Fire-and-forget: a storage error must never fail the user's delete action.
    //    deleteFromStorage handles both R2 and local-disk, and never throws.
    if (imgRows.rows.length > 0) {
      const urls = imgRows.rows.map(r => r.image_url);
      Promise.allSettled(urls.map(u => deleteFromStorage(u)))
        .then(results => {
          const failed = results.filter(r => r.status === "rejected").length;
          if (failed) console.error(`[listings] ${failed} storage deletion(s) failed for listing ${req.params.id}`);
          else        console.log(`[listings] deleted ${urls.length} image(s) from storage for listing ${req.params.id}`);
        });
    }

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
    // Enforce the 3-active-listing cap before re-activating
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM listings WHERE seller_id = $1 AND is_active = true",
      [req.userId]
    );
    if (parseInt(countResult.rows[0].count, 10) >= 3) {
      return res.status(403).json({ error: "listing_limit_reached" });
    }

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
      SELECT l.*, u.is_verified as seller_is_verified,
             (SELECT json_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = l.id) as images,
             (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id) as favorited_count
      FROM listings l
      JOIN users u ON u.id = l.seller_id
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
