import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { generateToken, requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password, bio } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email.toLowerCase(), username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email or username already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, bio)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, bio, avatar_url, rating, review_count, sales_count, created_at`,
      [username, email.toLowerCase(), hashedPassword, bio || ""]
    );
    const user = result.rows[0];
    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, bio, avatar_url, rating, review_count, sales_count, balance, created_at, location
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/auth/me
router.patch("/me", requireAuth, async (req, res) => {
  const { bio, location } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET bio = COALESCE($1, bio), location = COALESCE($2, location)
       WHERE id = $3
       RETURNING id, username, email, bio, avatar_url, rating, review_count, sales_count, balance, created_at, location`,
      [bio, location, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update me error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
