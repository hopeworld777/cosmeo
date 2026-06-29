import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import pool from "../db.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email.js";
import { uploadToR2 } from "../r2.js";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(
      path.extname(file.originalname).toLowerCase()
    ) && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

function generateSecureToken() {
  return crypto.randomBytes(48).toString("hex");
}

async function createAuthToken(userId, type, expiresInHours = 24) {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO auth_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4)",
    [userId, token, type, expiresAt]
  );
  return token;
}

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
    const emailCheck = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "email_taken" });
    }
    const usernameCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ error: "username_taken" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, bio, email_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, username, email, bio, avatar_url, rating, review_count, sales_count, email_verified, created_at`,
      [username, email.toLowerCase(), hashedPassword, bio || ""]
    );
    const user = result.rows[0];

    // Send verification email
    let verifyLink = null;
    try {
      const token = await createAuthToken(user.id, "email_verification", 24);
      verifyLink = await sendVerificationEmail(email.toLowerCase(), token);
    } catch (emailErr) {
      console.error("Email send error (non-fatal):", emailErr.message);
    }

    const jwtToken = generateToken(user.id);
    res.status(201).json({ user, token: jwtToken, verifyLink });
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
      `SELECT id, username, email, bio, avatar_url, rating, review_count, sales_count, buyer_rating, buyer_review_count, balance, email_verified, created_at, location
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

// POST /api/auth/avatar
router.post("/avatar", requireAuth, avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const ext  = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const key  = `avatars/${req.userId}-${Date.now()}${ext}`;
    const url  = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [url, req.userId]);
    res.json({ avatar_url: url });
  } catch (err) {
    console.error("Avatar upload error:", err.message);
    res.status(500).json({ error: "Avatar upload failed" });
  }
});

// PATCH /api/auth/me
router.patch("/me", requireAuth, async (req, res) => {
  const { username, bio, location } = req.body;
  try {
    // Validate + uniqueness-check username if provided
    if (username !== undefined) {
      const trimmed = (username || "").trim();
      if (trimmed.length < 2) {
        return res.status(400).json({ error: "Username must be at least 2 characters" });
      }
      if (trimmed.length > 30) {
        return res.status(400).json({ error: "Username must be 30 characters or fewer" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return res.status(400).json({ error: "Username may only contain letters, numbers and underscores" });
      }
      const conflict = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [trimmed, req.userId]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ error: "That username is already taken" });
      }
    }

    // Build a dynamic SET clause — only update fields that were actually sent
    const fields = [];
    const values = [];
    let idx = 1;

    if (username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(username.trim());
    }
    if (bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(bio);
    }
    if (location !== undefined) {
      fields.push(`location = $${idx++}`);
      values.push(location || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.userId);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, username, email, bio, avatar_url, rating, review_count,
                 sales_count, balance, email_verified, created_at, location`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update me error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT email, email_verified FROM users WHERE id = $1",
      [req.userId]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.email_verified) return res.status(400).json({ error: "Email already verified" });

    // Invalidate old tokens
    await pool.query(
      "UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = 'email_verification' AND used_at IS NULL",
      [req.userId]
    );

    const token = await createAuthToken(req.userId, "email_verification", 24);
    let verifyLink = null;
    try {
      verifyLink = await sendVerificationEmail(user.email, token);
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
    }
    res.json({ success: true, verifyLink });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    const result = await pool.query(
      `SELECT at.*, u.email FROM auth_tokens at
       JOIN users u ON u.id = at.user_id
       WHERE at.token = $1 AND at.type = 'email_verification' AND at.used_at IS NULL AND at.expires_at > NOW()`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return res.status(400).json({ error: "Invalid or expired verification link" });

    await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [row.user_id]);
    await pool.query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [row.id]);

    // Generate a fresh JWT so user is logged in after verifying
    const jwtToken = generateToken(row.user_id);
    const userResult = await pool.query(
      "SELECT id, username, email, bio, avatar_url, email_verified, rating, review_count, sales_count, buyer_rating, buyer_review_count FROM users WHERE id = $1",
      [row.user_id]
    );
    res.json({ success: true, user: userResult.rows[0], token: jwtToken });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  // Always respond success to prevent email enumeration
  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (user) {
      // Invalidate old reset tokens
      await pool.query(
        "UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = 'password_reset' AND used_at IS NULL",
        [user.id]
      );
      const token = await createAuthToken(user.id, "password_reset", 1);
      let resetLink = null;
      try {
        resetLink = await sendPasswordResetEmail(email.toLowerCase(), token);
      } catch (emailErr) {
        console.error("Email send error:", emailErr.message);
      }
      // Return link only in dev mode (when no SMTP configured)
      if (!process.env.SMTP_HOST) {
        return res.json({ success: true, devResetLink: resetLink });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    const result = await pool.query(
      `SELECT * FROM auth_tokens
       WHERE token = $1 AND type = 'password_reset' AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return res.status(400).json({ error: "Invalid or expired reset link" });

    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, row.user_id]);
    await pool.query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [row.id]);

    // Auto-login after reset
    const jwtToken = generateToken(row.user_id);
    const userResult = await pool.query(
      "SELECT id, username, email, bio, avatar_url, email_verified, rating, review_count, sales_count, buyer_rating, buyer_review_count FROM users WHERE id = $1",
      [row.user_id]
    );
    res.json({ success: true, user: userResult.rows[0], token: jwtToken });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// POST /api/auth/validate-reset-token  (check if token is valid before showing form)
router.post("/validate-reset-token", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const result = await pool.query(
      "SELECT id FROM auth_tokens WHERE token = $1 AND type = 'password_reset' AND used_at IS NULL AND expires_at > NOW()",
      [token]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch {
    res.json({ valid: false });
  }
});

// GET /api/auth/search-user?q=username — find a user by username prefix (for buyer search)
router.get("/search-user", requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT id, username, avatar_url FROM users
       WHERE username ILIKE $1 AND id != $2
       LIMIT 5`,
      [`${q.trim()}%`, req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Search user error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
