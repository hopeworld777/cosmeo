import jwt from "jsonwebtoken";
import pool from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "kosmeo-dev-secret-change-in-prod";

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    const check = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.userId]);
    if (!check.rows[0]?.is_admin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Gate that enforces the invite-only beta: only VIP/ADMIN accounts may use
// the real app APIs. Must run after requireAuth (needs req.userId).
// Set PUBLIC_LAUNCH=true (env) to lift this gate for everyone once Cosmeo
// launches publicly — no code change or migration needed at that point.
export async function requireFullAccess(req, res, next) {
  try {
    const check = await pool.query("SELECT access_status, deleted_at FROM users WHERE id = $1", [req.userId]);
    const row = check.rows[0];
    // A deleted account's JWT can still be cryptographically valid for up to
    // 30 days — this is the one gated check that already hits the DB, so it
    // doubles as a backstop against a lingering token being used to create
    // listings/messages/etc. after self-deletion, ahead of the client's next
    // /me refresh (see /auth/me and login routes for the primary checks).
    if (row?.deleted_at) return res.status(401).json({ error: "account_deleted" });
    if (process.env.PUBLIC_LAUNCH === "true") return next();
    if (row?.access_status === "VIP" || row?.access_status === "ADMIN") return next();
    return res.status(403).json({ error: "waitlist_pending" });
  } catch (err) {
    console.error("requireFullAccess error:", err);
    return res.status(500).json({ error: "Access check failed" });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.userId;
    } catch {
      // ignore invalid tokens for optional auth
    }
  }
  next();
}
