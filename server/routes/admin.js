import { Router } from "express";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// All routes require admin
router.use(requireAdmin);

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
router.patch("/reports/:id", async (req, res) => {
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
router.post("/users/:id/warn", async (req, res) => {
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
router.post("/users/:id/suspend", async (req, res) => {
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
router.post("/users/:id/ban", async (req, res) => {
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
router.post("/users/:id/unban", async (req, res) => {
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
