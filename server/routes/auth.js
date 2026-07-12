import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import pool from "../db.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email.js";
import { uploadToR2 } from "../r2.js";

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/gif", "image/avif", "image/bmp",
]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ALLOWED_AVATAR_TYPES.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported image format. Please upload a JPG, PNG, WEBP, or GIF."));
  },
});

const router = Router();

// Rate limiters for sensitive auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this IP. Please try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});

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
// Everyone lands on the WAITLIST by default (see access_status default in
// schema.sql). Passing a valid, active `inviteCode` (from an /invite/:code
// link) grants VIP access — full app permissions — immediately on signup.
// An invalid/missing code is never an error here; the account is just
// created on the waitlist like any normal signup.
router.post("/register", registerLimiter, async (req, res) => {
  const { username, email, password, bio, inviteCode } = req.body;
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

    let accessStatus = "WAITLIST";
    if (inviteCode && inviteCode.trim()) {
      const inviteCheck = await pool.query(
        "SELECT id FROM invite_codes WHERE code = $1 AND is_active = true",
        [inviteCode.trim().toUpperCase()]
      );
      if (inviteCheck.rows.length > 0) accessStatus = "VIP";
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, bio, email_verified, access_status)
       VALUES ($1, $2, $3, $4, false, $5)
       RETURNING id, username, email, bio, avatar_url, rating, review_count, sales_count, email_verified, access_status, created_at`,
      [username, email.toLowerCase(), hashedPassword, bio || "", accessStatus]
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
    if (err.code === "23505" && err.constraint && err.constraint.includes("email")) {
      return res.status(409).json({ error: "email_taken" });
    }
    if (err.code === "23505" && err.constraint && err.constraint.includes("username")) {
      return res.status(409).json({ error: "username_taken" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET /api/auth/invite/:code — public check used by the /invite/:code
// landing route before it drops the visitor into the normal register form.
router.get("/invite/:code", async (req, res) => {
  const code = (req.params.code || "").trim().toUpperCase();
  if (!code) return res.json({ valid: false });
  try {
    const result = await pool.query(
      "SELECT id FROM invite_codes WHERE code = $1 AND is_active = true",
      [code]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch (err) {
    console.error("Invite check error:", err);
    res.status(500).json({ valid: false });
  }
});

const BCRYPT_ROUNDS = 10; // cost 10 ≈ 100 ms; cost 12 (old default) ≈ 400–2000 ms on shared CPU

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const t0 = Date.now();

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    console.log(`[login] DB query: ${Date.now() - t0}ms`);

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const rounds = bcrypt.getRounds(user.password_hash);
    console.log(`[login] bcrypt rounds in stored hash: ${rounds}`);
    const t1 = Date.now();

    const valid = await bcrypt.compare(password, user.password_hash);
    console.log(`[login] bcrypt.compare: ${Date.now() - t1}ms | valid: ${valid}`);

    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
    console.log(`[login] total: ${Date.now() - t0}ms`);

    // Fire-and-forget: upgrade hashes stored at a higher cost factor so
    // subsequent logins are fast without blocking this response.
    if (rounds > BCRYPT_ROUNDS) {
      console.log(`[login] upgrading hash from rounds ${rounds} → ${BCRYPT_ROUNDS}`);
      bcrypt.hash(password, BCRYPT_ROUNDS)
        .then(newHash => pool.query(
          "UPDATE users SET password_hash = $1 WHERE id = $2",
          [newHash, user.id]
        ))
        .then(() => console.log(`[login] hash upgraded for user ${user.id}`))
        .catch(err => console.error("Hash upgrade error:", err.message));
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, bio, avatar_url, rating, review_count, sales_count, balance, email_verified, created_at, location,
              is_admin, is_verified, is_banned, warning_count, access_status
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
router.post("/avatar", requireAuth, (req, res, next) => {
  // Run multer manually so format/size errors return JSON instead of a 500.
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
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
      if (!/^[a-zA-Z0-9_.]+$/.test(trimmed)) {
        return res.status(400).json({ error: "Username may only contain letters, numbers, underscores, and dots" });
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
      `UPDATE users SET ${fields.join(", ")} WHERE id = ${idx}
       RETURNING id, username, email, bio, avatar_url, rating, review_count,
                 sales_count, balance, email_verified, created_at, location,
                 is_admin, is_verified, is_banned, warning_count, access_status`,
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
      "SELECT id, username, email, bio, avatar_url, email_verified, rating, review_count, sales_count, is_admin, is_verified, is_banned, warning_count, access_status FROM users WHERE id = $1",
      [row.user_id]
    );
    res.json({ success: true, user: userResult.rows[0], token: jwtToken });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, row.user_id]);
    await pool.query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [row.id]);

    // Auto-login after reset
    const jwtToken = generateToken(row.user_id);
    const userResult = await pool.query(
      "SELECT id, username, email, bio, avatar_url, email_verified, rating, review_count, sales_count, is_admin, is_verified, is_banned, warning_count, access_status FROM users WHERE id = $1",
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
