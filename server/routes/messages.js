import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/messages/conversations
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (c.id) c.id, c.listing_id, c.created_at,
             l.title as listing_title,
             CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END as other_user_id,
             ou.username as other_username, ou.avatar_url as other_avatar,
             (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND recipient_id = $1 AND is_read = false) as unread_count
      FROM conversations c
      JOIN listings l ON l.id = c.listing_id
      JOIN users ou ON ou.id = (CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END)
      WHERE c.buyer_id = $1 OR c.seller_id = $1
      ORDER BY c.id, last_message_at DESC NULLS LAST
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Conversations error:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET /api/messages/conversations/:id
router.get("/conversations/:id", requireAuth, async (req, res) => {
  try {
    const conv = await pool.query(
      "SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)",
      [req.params.id, req.userId]
    );
    if (!conv.rows[0]) return res.status(404).json({ error: "Not found" });

    const messages = await pool.query(
      `SELECT m.*, u.username, u.avatar_url FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    // Mark messages as read
    await pool.query(
      "UPDATE messages SET is_read = true WHERE conversation_id = $1 AND recipient_id = $2",
      [req.params.id, req.userId]
    );

    res.json(messages.rows);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages/conversations
router.post("/conversations", requireAuth, async (req, res) => {
  const { listing_id, body } = req.body;
  if (!listing_id || !body) return res.status(400).json({ error: "listing_id and body required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const listing = await client.query("SELECT seller_id FROM listings WHERE id = $1", [listing_id]);
    if (!listing.rows[0]) return res.status(404).json({ error: "Listing not found" });
    const sellerId = listing.rows[0].seller_id;

    if (sellerId === req.userId) return res.status(400).json({ error: "Cannot message yourself" });

    let conv = await client.query(
      "SELECT id FROM conversations WHERE listing_id = $1 AND buyer_id = $2",
      [listing_id, req.userId]
    );
    let convId;
    if (conv.rows[0]) {
      convId = conv.rows[0].id;
    } else {
      const newConv = await client.query(
        "INSERT INTO conversations (listing_id, buyer_id, seller_id) VALUES ($1,$2,$3) RETURNING id",
        [listing_id, req.userId, sellerId]
      );
      convId = newConv.rows[0].id;
    }

    const msg = await client.query(
      "INSERT INTO messages (conversation_id, sender_id, recipient_id, body) VALUES ($1,$2,$3,$4) RETURNING *",
      [convId, req.userId, sellerId, body]
    );

    await client.query("COMMIT");
    res.status(201).json({ conversation_id: convId, message: msg.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create conversation error:", err);
    res.status(500).json({ error: "Failed to send message" });
  } finally {
    client.release();
  }
});

// POST /api/messages/conversations/:id
router.post("/conversations/:id", requireAuth, async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "body required" });
  try {
    const conv = await pool.query(
      "SELECT * FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)",
      [req.params.id, req.userId]
    );
    if (!conv.rows[0]) return res.status(404).json({ error: "Not found" });
    const recipientId = conv.rows[0].buyer_id === req.userId
      ? conv.rows[0].seller_id
      : conv.rows[0].buyer_id;

    const msg = await pool.query(
      "INSERT INTO messages (conversation_id, sender_id, recipient_id, body) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.params.id, req.userId, recipientId, body]
    );
    res.status(201).json(msg.rows[0]);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
