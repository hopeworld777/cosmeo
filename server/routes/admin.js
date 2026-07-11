import { Router } from "express";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { sendWaitlistLinkEmail, sendWaitlistVipInvite } from "../email.js";

const router = Router();

// All routes require admin JWT
router.use(requireAdmin);

// Ensures :id route params are numeric before they hit a SQL integer column,
// so bad input yields a clean 400 instead of a Postgres cast error (500).
function requireNumericId(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  next();
}

// ── GET /api/admin/waitlist ──────────────────────────────────────────────────
router.get("/waitlist", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM waitlist ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin waitlist error:", err);
    res.status(500).json({ error: "Failed to fetch waitlist" });
  }
});

// ── POST /api/admin/waitlist/:id/send-link ───────────────────────────────────
router.post("/waitlist/:id/send-link", requireNumericId, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM waitlist WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    await sendWaitlistLinkEmail(rows[0].email);
    const updated = await pool.query(
      "UPDATE waitlist SET link_sent = true, link_sent_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("send-link error:", err);
    res.status(500).json({ error: err.message || "Failed to send link email" });
  }
});

// ── POST /api/admin/waitlist/:id/send-vip-invite ─────────────────────────────
router.post("/waitlist/:id/send-vip-invite", requireNumericId, async (req, res) => {
  const vipCode = process.env.VIP_CODE?.trim();
  if (!vipCode) return res.status(503).json({ error: "VIP_CODE is not configured on the server." });
  try {
    const { rows } = await pool.query("SELECT * FROM waitlist WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    await sendWaitlistVipInvite(rows[0].email, vipCode);
    const updated = await pool.query(
      "UPDATE waitlist SET vip_invited = true, vip_invited_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("send-vip-invite error:", err);
    res.status(500).json({ error: err.message || "Failed to send VIP invite" });
  }
});

// ── GET /api/admin/stats ────────────────────────────────────────────────────
// Total users, total listings, breakdown by marketplace type (buy/rent/commission)
router.get("/stats", async (req, res) => {
  try {
    const [users, listings, byType, pending, reportsOpen] = await Promise.all([
      pool.query("SELECT COUNT(*) AS count FROM users"),
      pool.query("SELECT COUNT(*) AS count FROM listings"),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE is_for_sale AND NOT is_for_rent) AS buy,
          COUNT(*) FILTER (WHERE is_for_rent AND NOT is_for_sale) AS rent,
          COUNT(*) FILTER (WHERE is_for_sale AND is_for_rent)     AS buy_and_rent
        FROM listings
      `),
      pool.query("SELECT COUNT(*) AS count FROM listings WHERE is_flagged = true OR status = 'pending'"),
      pool.query("SELECT COUNT(*) AS count FROM reports WHERE status = 'open'"),
    ]);
    const activeListings = await pool.query("SELECT COUNT(*) AS count FROM listings WHERE is_active = true");

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalListings: parseInt(listings.rows[0].count),
      activeListings: parseInt(activeListings.rows[0].count),
      // Note: "Commission" is a frontend-only marketplace filter, not a persisted
      // listing type — listing creation requires is_for_sale or is_for_rent, so
      // there is no commission bucket to report here.
      byType: {
        buy: parseInt(byType.rows[0].buy),
        rent: parseInt(byType.rows[0].rent),
        buyAndRent: parseInt(byType.rows[0].buy_and_rent),
      },
      pendingListings: parseInt(pending.rows[0].count),
      openReports: parseInt(reportsOpen.rows[0].count),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── GET /api/admin/listings ─────────────────────────────────────────────────
// Query params: filter (pending|reported|all), limit, offset
router.get("/listings", async (req, res) => {
  const { filter = "all", limit = 50, offset = 0 } = req.query;
  try {
    const conditions = [];
    if (filter === "pending") conditions.push("l.status = 'pending'");
    if (filter === "reported") conditions.push("l.is_flagged = true");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(`
      SELECT
        l.*,
        s.username    AS seller_username,
        s.avatar_url  AS seller_avatar,
        s.is_banned   AS seller_is_banned
      FROM listings l
      LEFT JOIN users s ON s.id = l.seller_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    res.json(result.rows);
  } catch (err) {
    console.error("Admin listings error:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ── POST /api/admin/listings/:id/feature ────────────────────────────────────
// Toggle "Featured Spotlight" for a listing
router.post("/listings/:id/feature", requireNumericId, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE listings SET is_featured = NOT is_featured WHERE id = $1
      RETURNING id, title, is_featured
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Listing not found" });
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    console.error("Feature listing error:", err);
    res.status(500).json({ error: "Failed to update featured status" });
  }
});

// ── POST /api/admin/listings/:id/approve ────────────────────────────────────
// Toggle a listing's active/pending status — approves a pending listing and
// clears any flag raised against it.
router.post("/listings/:id/approve", requireNumericId, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE listings
      SET status = 'active', is_active = true, is_flagged = false
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Listing not found" });
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    console.error("Approve listing error:", err);
    res.status(500).json({ error: "Failed to approve listing" });
  }
});

// ── DELETE /api/admin/listings/:id ──────────────────────────────────────────
// Remove spam/violating listings entirely
router.delete("/listings/:id", requireNumericId, async (req, res) => {
  let deleted;
  try {
    // Atomic delete — RETURNING gives us the pre-delete row in one statement,
    // so there's no separate SELECT that a concurrent request could race with.
    const result = await pool.query(
      "DELETE FROM listings WHERE id = $1 RETURNING id, title, seller_id",
      [req.params.id]
    );
    deleted = result.rows[0];
    if (!deleted) return res.status(404).json({ error: "Listing not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete listing error:", err);
    return res.status(500).json({ error: "Failed to delete listing" });
  }

  // Notification write is best-effort: the listing is already gone and the
  // response already sent, so a failure here must never surface as an error
  // to the admin or imply the delete didn't happen.
  if (deleted.seller_id) {
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message_en, message_ka)
         VALUES ($1, 'listing_removed', $2, $3)`,
        [
          deleted.seller_id,
          `Your listing "${deleted.title}" was removed by our moderation team for violating our marketplace guidelines. Reminder: all listing photos must be real photos of the actual item — no stock or stolen images ("Real Photos Only" policy).`,
          `თქვენი განცხადება "${deleted.title}" წაიშალა მოდერაციის მიერ წესების დარღვევის გამო. შეგახსენებთ: ყველა ფოტო უნდა იყოს ნივთის რეალური ფოტო — არ დაუშვებთ საწყობის ან სხვისი ფოტოების გამოყენებას ("მხოლოდ რეალური ფოტოები" წესი).`,
        ]
      );
    } catch (err) {
      console.error("Listing-removed notification insert failed:", err);
    }
  }
});

// ── GET /api/admin/users ────────────────────────────────────────────────────
// Query params: search, limit, offset
router.get("/users", async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (search) {
      conditions.push(`(username ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(`
      SELECT id, username, email, avatar_url, is_admin, is_verified, is_banned,
             warning_count, sales_count, rating, review_count, created_at,
             (SELECT COUNT(*) FROM listings WHERE seller_id = users.id) AS listings_count
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);
    res.json(result.rows);
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── POST /api/admin/users/:id/verify ────────────────────────────────────────
// Toggle "Verified Creator" badge
router.post("/users/:id/verify", requireNumericId, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users SET is_verified = NOT is_verified WHERE id = $1
      RETURNING id, username, is_verified
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Verify user error:", err);
    res.status(500).json({ error: "Failed to update verification status" });
  }
});

// ── GET /api/admin/reports ─────────────────────────────────────────────────
// Query params: status (open|resolved|ignored), reason
router.get("/reports", async (req, res) => {
  const { status, reason, limit = 50, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`r.status = $${idx++}`);
      params.push(status);
    }
    if (reason) {
      conditions.push(`r.reason = $${idx++}`);
      params.push(reason);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(`
      SELECT
        r.*,
        reporter.id         AS reporter_id,
        reporter.username   AS reporter_username,
        reporter.avatar_url AS reporter_avatar,
        reported.id         AS reported_id,
        reported.username   AS reported_username,
        reported.avatar_url AS reported_avatar,
        reported.is_banned  AS reported_is_banned,
        reported.warning_count AS reported_warning_count,
        reviewer.username   AS reviewed_by_username,
        l.title             AS listing_title
      FROM reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_user_id
      LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
      LEFT JOIN listings l     ON l.id = r.listing_id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json(result.rows);
  } catch (err) {
    console.error("Admin reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ── GET /api/admin/reports/reasons ────────────────────────────────────────
// Returns all distinct reasons for the filter dropdown
router.get("/reports/reasons", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT reason FROM reports ORDER BY reason"
    );
    res.json(result.rows.map(r => r.reason));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reasons" });
  }
});

// ── PATCH /api/admin/reports/:id ───────────────────────────────────────────
// body: { status: "resolved" | "ignored", resolution_note?: string }
router.patch("/reports/:id", requireNumericId, async (req, res) => {
  const { status, resolution_note = "" } = req.body;
  if (!["resolved", "ignored"].includes(status)) {
    return res.status(400).json({ error: "Status must be resolved or ignored" });
  }
  try {
    const result = await pool.query(`
      UPDATE reports
      SET status = $1, resolution_note = $2, reviewed_at = NOW(), reviewed_by = $3
      WHERE id = $4
      RETURNING *
    `, [status, resolution_note, req.userId, req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ error: "Report not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update report error:", err);
    res.status(500).json({ error: "Failed to update report" });
  }
});

// ── POST /api/admin/users/:id/warn ────────────────────────────────────────
router.post("/users/:id/warn", requireNumericId, async (req, res) => {
  let user;
  try {
    const result = await pool.query(`
      UPDATE users SET warning_count = warning_count + 1 WHERE id = $1
      RETURNING id, username, warning_count, is_banned
    `, [req.params.id]);
    user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Warn user error:", err);
    return res.status(500).json({ error: "Failed to warn user" });
  }

  // Best-effort: the warning has already been applied and the response sent,
  // so a notification failure must not surface as an error to the admin.
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, message_en, message_ka)
       VALUES ($1, 'warning', $2, $3)`,
      [
        user.id,
        "You have received a warning from our moderation team for violating our community marketplace guidelines. Please review our Terms & Safety policy.",
        "თქვენ მიიღეთ გაფრთხილება მოდერაციისგან საზოგადოების წესების დარღვევის გამო. გთხოვთ გაეცნოთ ჩვენს წესებსა და უსაფრთხოების პოლიტიკას.",
      ]
    );
  } catch (err) {
    console.error("Warning notification insert failed:", err);
  }
});

// ── POST /api/admin/users/:id/suspend ─────────────────────────────────────
// Suspend = is_banned true (temporary, can be reversed)
router.post("/users/:id/suspend", requireNumericId, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users SET is_banned = true WHERE id = $1
      RETURNING id, username, is_banned
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Suspend user error:", err);
    res.status(500).json({ error: "Failed to suspend user" });
  }
});

// ── POST /api/admin/users/:id/ban ─────────────────────────────────────────
// Permanent ban — same column, treated as permanent by convention
router.post("/users/:id/ban", requireNumericId, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users SET is_banned = true WHERE id = $1
      RETURNING id, username, is_banned
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Ban user error:", err);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

// ── POST /api/admin/users/:id/unban ───────────────────────────────────────
router.post("/users/:id/unban", requireNumericId, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users SET is_banned = false WHERE id = $1
      RETURNING id, username, is_banned
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Unban user error:", err);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

export default router;
