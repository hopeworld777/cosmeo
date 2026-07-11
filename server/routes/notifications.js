import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// ── GET /api/notifications ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, message_en, message_ka, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ── PUT /api/notifications/:id/read ─────────────────────────────────────────
router.put("/:id/read", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, type, message_en, message_ka, is_read, created_at`,
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Notification not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// ── DELETE /api/notifications/:id ───────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  try {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Notification not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Dismiss notification error:", err);
    res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

export default router;
