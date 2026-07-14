import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import pool from "../db.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email.js";
import { uploadToR2 } from "../r2.js";

// Support both the Replit secret name and the conventional Railway/Heroku name.
// Read at call-time (not module load) so a newly-added env var takes effect
// without requiring a server restart.
function getGoogleClient() {
  const id = process.env.Google_OAuth_Client_ID || process.env.GOOGLE_CLIENT_ID;
  return id ? { client: new OAuth2Client(id), id } : null;
}

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

// Google auth is both login AND registration in one hop, so it needs its own
// limiter — stricter than login but looser than register, since a user may
// legitimately retry several times if the popup fails on the first attempt.
const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 attempts per IP per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many Google sign-in attempts. Please wait 15 minutes and try again." },
});

// Hidden admin gate's Google sign-in — tighter than the normal Google
// limiter since this endpoint is a prime target for credential-stuffing /
// enumeration attempts against the admin panel.
const adminGoogleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin sign-in attempts. Please wait 15 minutes and try again." },
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

// Shared by /register and /google — an active invite code grants VIP
// access immediately; anything else (missing/invalid code) lands on the
// default WAITLIST tier like a normal signup.
async function resolveAccessStatus(inviteCode) {
  if (!inviteCode || !inviteCode.trim()) return "WAITLIST";
  const inviteCheck = await pool.query(
    "SELECT id FROM invite_codes WHERE code = $1 AND is_active = true",
    [inviteCode.trim().toUpperCase()]
  );
  return inviteCheck.rows.length > 0 ? "VIP" : "WAITLIST";
}

// Derives a unique username from a Google display name / email local-part.
// Falls back to a random suffix on collision so signup never fails on this.
async function generateUniqueUsername(seed) {
  const base = (seed || "cosplayer")
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24) || "cosplayer";
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [candidate]);
    if (existing.rows.length === 0) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}${crypto.randomBytes(4).toString("hex")}`;
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

    const accessStatus = await resolveAccessStatus(inviteCode);

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

// POST /api/auth/google
// Google Identity Services on the frontend hands us a signed ID token
// ("credential") after the user picks a Google account — we verify it
// server-side (never trust an unverified token) and either:
//   1. find an existing user by google_id → sign them in
//   2. find an existing user by email (signed up with a password before)
//      → link this Google account to it so we never create a duplicate
//   3. create a brand-new account, same WAITLIST/VIP invite-code logic as
//      /register, with the email pre-verified (Google already confirmed it)
router.post("/google", googleAuthLimiter, async (req, res) => {
  // ── Step 1: check configuration ──────────────────────────────────────────
  const googleAuth = getGoogleClient();
  if (!googleAuth) {
    console.error("[google-auth] FAIL step=config — no client ID in env (Google_OAuth_Client_ID / GOOGLE_CLIENT_ID)");
    return res.status(503).json({ error: "Google sign-in is not configured" });
  }
  const { client: googleClient, id: GOOGLE_CLIENT_ID } = googleAuth;
  console.log(`[google-auth] step=config — client ID prefix: ${GOOGLE_CLIENT_ID.slice(0, 12)}...`);

  // ── Step 2: check credential presence ────────────────────────────────────
  const { credential, inviteCode } = req.body;
  if (!credential) {
    console.error("[google-auth] FAIL step=credential — no credential in request body");
    return res.status(400).json({ error: "Missing Google credential" });
  }
  console.log(`[google-auth] step=credential — received token (${credential.length} chars)`);

  // ── Step 3: verify the ID token with Google ───────────────────────────────
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
    console.log(`[google-auth] step=verify — OK, email domain: ${payload?.email?.split("@")[1] ?? "unknown"}`);
  } catch (verifyErr) {
    // Surface the exact Google rejection reason — common causes:
    //   "Token used too late"  → server clock skew
    //   "Invalid audience"     → client ID mismatch between frontend and backend
    //   "Token is expired"     → credential was issued too long ago before this request arrived
    console.error(`[google-auth] FAIL step=verify — ${verifyErr.constructor?.name}: ${verifyErr.message}`);
    return res.status(401).json({
      error: "Google sign-in failed. Please try again.",
      // detail is safe to expose (no secrets), helpful for client-side debugging
      detail: verifyErr.message,
    });
  }

  if (!payload?.email) {
    console.error("[google-auth] FAIL step=payload — no email in Google token payload");
    return res.status(400).json({ error: "Google account has no email" });
  }

  // ── Step 4: find / link / create the account ──────────────────────────────
  try {
    const googleId = payload.sub;
    const email    = payload.email.toLowerCase();
    const picture  = payload.picture || null;

    // 1. Already linked — sign in.
    let result = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
    let user   = result.rows[0];
    if (user) console.log(`[google-auth] step=lookup — found by google_id`);

    // 2. Existing email/password account — link, don't duplicate.
    if (!user) {
      result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      user   = result.rows[0];
      if (user) {
        console.log(`[google-auth] step=lookup — found by email; linking google_id`);
        const updated = await pool.query(
          `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), email_verified = true
           WHERE id = $3 RETURNING *`,
          [googleId, picture, user.id]
        );
        user = updated.rows[0];
      }
    }

    // 3. Brand-new account.
    if (!user) {
      const accessStatus = await resolveAccessStatus(inviteCode);
      const usernameSeed = payload.name || email.split("@")[0];
      const username     = await generateUniqueUsername(usernameSeed);
      console.log(`[google-auth] step=lookup — new user; access_status=${accessStatus}`);
      const inserted = await pool.query(
        `INSERT INTO users (username, email, password_hash, avatar_url, google_id, email_verified, access_status)
         VALUES ($1, $2, NULL, $3, $4, true, $5)
         RETURNING *`,
        [username, email, picture, googleId, accessStatus]
      );
      user = inserted.rows[0];
    }

    if (user.is_banned) {
      console.warn(`[google-auth] FAIL step=access — account is banned (id=${user.id})`);
      return res.status(403).json({ error: "This account has been suspended." });
    }

    const jwtToken = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    console.log(`[google-auth] step=done — sign-in OK (id=${user.id}, access=${user.access_status})`);
    res.json({ user: safeUser, token: jwtToken });
  } catch (dbErr) {
    console.error(`[google-auth] FAIL step=db — ${dbErr.constructor?.name}: ${dbErr.message}`);
    res.status(500).json({ error: "Account lookup failed. Please try again." });
  }
});

// POST /api/auth/admin-google
// "Continue with Google" on the hidden admin gate (/secret-admin-gate).
// Uses the exact same Google Identity Services credential-verification
// flow as /api/auth/google, but with a hard server-side allowlist: only
// the one authorized admin Google account may ever succeed here. The
// frontend never makes this decision — it just relays whatever the
// backend returns — so there is no client-side bypass.
const ADMIN_ALLOWED_EMAIL = (process.env.ADMIN_GOOGLE_EMAIL || "bbunnixx7@gmail.com").toLowerCase();
const ADMIN_SUB_SETTING_KEY = "admin_google_sub";

// The email above is the human-facing allowlist, but emails can be renamed
// or aliased on Google's side — the "sub" claim (payload.sub) is the
// account's permanent, immutable subject ID and is what we actually pin
// admin access to. Resolution order: an explicit ADMIN_GOOGLE_SUB env var
// always wins (lets an operator hard-pin or rotate it out-of-band);
// otherwise fall back to whatever sub was recorded in the DB the first
// time the allowlisted email ever signed in here.
async function getTrustedAdminSub() {
  if (process.env.ADMIN_GOOGLE_SUB) return process.env.ADMIN_GOOGLE_SUB;
  const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", [ADMIN_SUB_SETTING_KEY]);
  return result.rows[0]?.value || null;
}

async function recordTrustedAdminSub(sub) {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [ADMIN_SUB_SETTING_KEY, sub]
  );
}

router.post("/admin-google", adminGoogleAuthLimiter, async (req, res) => {
  // ── Step 1: check configuration ──────────────────────────────────────────
  const googleAuth = getGoogleClient();
  if (!googleAuth) {
    console.error("[admin-google-auth] FAIL step=config — no client ID in env (Google_OAuth_Client_ID / GOOGLE_CLIENT_ID)");
    return res.status(503).json({ error: "Google sign-in is not configured" });
  }
  const { client: googleClient, id: GOOGLE_CLIENT_ID } = googleAuth;

  // ── Step 2: check credential presence ────────────────────────────────────
  const { credential } = req.body;
  if (!credential) {
    console.error("[admin-google-auth] FAIL step=credential — no credential in request body");
    return res.status(400).json({ error: "Missing Google credential" });
  }

  // ── Step 3: verify the ID token with Google ───────────────────────────────
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (verifyErr) {
    console.error(`[admin-google-auth] FAIL step=verify — ${verifyErr.constructor?.name}: ${verifyErr.message}`);
    return res.status(401).json({
      error: "Google sign-in failed. Please try again.",
      detail: verifyErr.message,
    });
  }

  if (!payload?.email) {
    console.error("[admin-google-auth] FAIL step=payload — no email in Google token payload");
    return res.status(400).json({ error: "Google account has no email" });
  }

  const email = payload.email.toLowerCase();
  const sub   = payload.sub;

  // ── Step 4: server-side authorization — the ONLY checks that matter. ─────
  // Never trust the frontend to enforce this. Two independent checks:
  //   a) email must match the allowlisted admin email
  //   b) sub (Google's permanent, immutable subject ID) must match the
  //      trusted sub — pinned on first successful login, or forced via
  //      ADMIN_GOOGLE_SUB. The email alone isn't enough: Google lets an
  //      account rename its email or use aliases, so pinning to the sub
  //      is what actually prevents a renamed/aliased account (or a
  //      never-should-have-matched account after some future email churn)
  //      from silently inheriting admin access.
  // Both failures return the same generic message so neither leaks which
  // check tripped or what value would have passed.
  if (email !== ADMIN_ALLOWED_EMAIL) {
    console.warn(`[admin-google-auth] FAIL step=allowlist — unauthorized Google account attempted admin login (email domain: ${email.split("@")[1] ?? "unknown"})`);
    return res.status(403).json({ error: "You are not authorized to access the admin panel." });
  }

  try {
    const trustedSub = await getTrustedAdminSub();
    if (trustedSub) {
      if (sub !== trustedSub) {
        console.warn(`[admin-google-auth] FAIL step=sub-check — allowlisted email presented an unrecognized Google subject ID (possible account change/alias)`);
        return res.status(403).json({ error: "You are not authorized to access the admin panel." });
      }
    } else {
      // First-ever successful admin login: pin this account's sub so all
      // future logins are checked against it, not just the email.
      await recordTrustedAdminSub(sub);
      console.log(`[admin-google-auth] step=sub-check — no trusted sub on record yet; pinned current Google account's sub as the admin identity`);
    }
  } catch (subErr) {
    console.error(`[admin-google-auth] FAIL step=sub-check — ${subErr.constructor?.name}: ${subErr.message}`);
    return res.status(500).json({ error: "Admin sign-in failed. Please try again." });
  }

  // ── Step 5: find / upsert the admin account, then sign a normal session ──
  try {
    const googleId = sub;
    const picture  = payload.picture || null;

    let result = await pool.query("SELECT * FROM users WHERE google_id = $1 OR email = $2", [googleId, email]);
    let user   = result.rows[0];

    if (user) {
      // Make sure this account is (still) flagged as admin/full-access and
      // linked to this Google ID, in case it was created some other way.
      const updated = await pool.query(
        `UPDATE users
         SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), email_verified = true,
             is_admin = true, access_status = 'ADMIN'
         WHERE id = $3 RETURNING *`,
        [googleId, picture, user.id]
      );
      user = updated.rows[0];
    } else {
      const usernameSeed = payload.name || email.split("@")[0];
      const username = await generateUniqueUsername(usernameSeed);
      const inserted = await pool.query(
        `INSERT INTO users (username, email, password_hash, avatar_url, google_id, email_verified, is_admin, access_status)
         VALUES ($1, $2, NULL, $3, $4, true, true, 'ADMIN')
         RETURNING *`,
        [username, email, picture, googleId]
      );
      user = inserted.rows[0];
    }

    if (user.is_banned) {
      console.warn(`[admin-google-auth] FAIL step=access — admin account is banned (id=${user.id})`);
      return res.status(403).json({ error: "This account has been suspended." });
    }

    const jwtToken = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    // Audit log — success. Never logs the credential/JWT, only identifying
    // info useful for reviewing admin access after the fact.
    console.log(`[admin-google-auth] SUCCESS admin login — user_id=${user.id} email=${email} ip=${req.ip}`);
    res.json({ user: safeUser, token: jwtToken });
  } catch (dbErr) {
    console.error(`[admin-google-auth] FAIL step=db — ${dbErr.constructor?.name}: ${dbErr.message}`);
    res.status(500).json({ error: "Admin sign-in failed. Please try again." });
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
    if (!user.password_hash) {
      return res.status(401).json({ error: "This account uses Google sign-in. Continue with Google to log in." });
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
