import { Router } from "express";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// All routes require admin
router.use(requireAdmin);

// Ensures :id route params are numeric before they hit a SQL integer column,
// so bad input yields a clean 400 instead of a Postgres cast error (500).
function requireNumericId(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  next();
}

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

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalListings: parseInt(listings.rows[0].count),
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
  try {
    const result = await pool.query(
      "DELETE FROM listings WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Listing not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete listing error:", err);
    res.status(500).json({ error: "Failed to delete listing" });
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
  try {
    const result = await pool.query(`
      UPDATE users SET warning_count = warning_count + 1 WHERE id = $1
      RETURNING id, username, warning_count, is_banned
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Warn user error:", err);
    res.status(500).json({ error: "Failed to warn user" });
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
