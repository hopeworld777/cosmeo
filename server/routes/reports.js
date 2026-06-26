import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const VALID_REASONS = [
  "report_reason_scam",
  "report_reason_fake_listing",
  "report_reason_offplatform",
  "report_reason_harassment",
  "report_reason_counterfeit",
  "report_reason_other",
];

const createReportSchema = z.object({
  reported_user_id: z.number().int().positive().nullable().optional(),
  listing_id:       z.number().int().positive().nullable().optional(),
  conversation_id:  z.number().int().positive().nullable().optional(),
  reason:           z.enum(VALID_REASONS),
  detail:           z.string().max(500).optional().default(""),
});

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid payload" });
  }

  const { reported_user_id, listing_id, conversation_id, reason, detail } = parsed.data;

  if (!reported_user_id && !listing_id) {
    return res.status(400).json({ error: "Must supply reported_user_id or listing_id" });
  }

  if (reported_user_id && reported_user_id === req.userId) {
    return res.status(400).json({ error: "Cannot report yourself" });
  }

  const dupe = await pool.query(
    `SELECT id FROM reports
     WHERE reporter_id = $1
       AND (reported_user_id = $2 OR listing_id = $3)
       AND status = 'open'
     LIMIT 1`,
    [req.userId, reported_user_id ?? null, listing_id ?? null]
  );
  if (dupe.rows[0]) {
    return res.status(409).json({ error: "You already have an open report for this target" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reports
         (reporter_id, reported_user_id, listing_id, conversation_id, reason, detail)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, created_at`,
      [req.userId, reported_user_id ?? null, listing_id ?? null, conversation_id ?? null, reason, detail]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// ── GET /api/reports/admin ────────────────────────────────────────────────────
router.get("/admin", requireAuth, async (req, res) => {
  const adminCheck = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.userId]);
  if (!adminCheck.rows[0]?.is_admin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { status = "open", limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT r.*,
              reporter.username  AS reporter_username,
              reported.username  AS reported_username,
              l.title            AS listing_title
       FROM reports r
       LEFT JOIN users reporter ON reporter.id = r.reporter_id
       LEFT JOIN users reported ON reported.id = r.reported_user_id
       LEFT JOIN listings l     ON l.id        = r.listing_id
       WHERE ($1::text = 'all' OR r.status = $1)
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ── PATCH /api/reports/admin/:id ──────────────────────────────────────────────
router.patch("/admin/:id", requireAuth, async (req, res) => {
  const adminCheck = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.userId]);
  if (!adminCheck.rows[0]?.is_admin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { status, resolution_note, action } = req.body;
  const VALID_STATUSES = ["reviewed", "resolved", "dismissed"];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const report = await client.query(
      "SELECT * FROM reports WHERE id = $1", [req.params.id]
    );
    if (!report.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Report not found" });
    }

    const r = report.rows[0];

    await client.query(
      `UPDATE reports SET status=$1, resolution_note=$2, reviewed_at=NOW(), reviewed_by=$3
       WHERE id=$4`,
      [status, resolution_note || null, req.userId, req.params.id]
    );

    if (action === "warn_user" && r.reported_user_id) {
      // Age policy note: if the warned account is confirmed to belong to a user
      // under 16, escalate directly to suspension rather than issuing a warning.
      // Repeat violations of the 16+ age policy may result in a permanent ban.
      await client.query(
        "UPDATE users SET warning_count = warning_count + 1 WHERE id = $1",
        [r.reported_user_id]
      );
    } else if (action === "ban_user" && r.reported_user_id) {
      // Age policy note: accounts confirmed to belong to users under 16 must be
      // suspended immediately. Permanent bans apply for repeat age-policy violations
      // or for any account found sharing exploitative content involving minors.
      await client.query(
        "UPDATE users SET is_banned = true WHERE id = $1",
        [r.reported_user_id]
      );
    } else if (action === "remove_listing" && r.listing_id) {
      await client.query(
        "UPDATE listings SET is_active = false, is_flagged = true WHERE id = $1",
        [r.listing_id]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, action: action || null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Admin resolve report error:", err);
    res.status(500).json({ error: "Failed to update report" });
  } finally {
    client.release();
  }
});

export default router;
