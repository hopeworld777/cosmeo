import { Router } from "express";
import pool from "../db.js";
import { sendWaitlistConfirmation } from "../email.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/waitlist — save an email to the waitlist
router.post("/", async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  const normalised = email.trim().toLowerCase();
  try {
    await pool.query(
      "INSERT INTO waitlist (email) VALUES ($1)",
      [normalised]
    );
    // Fire-and-forget — don't let an email failure block the signup response
    sendWaitlistConfirmation(normalised).catch(err => {
      console.error("Waitlist confirmation email error (non-fatal):", err.message);
      // Log the full Resend rejection payload so we can diagnose delivery issues
      if (err?.cause) console.error("  cause:", JSON.stringify(err.cause, null, 2));
      if (err?.response) console.error("  response:", JSON.stringify(err.response, null, 2));
      console.error("  full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    });
    res.json({ success: true });
  } catch (err) {
    // Unique-violation code 23505 means the address is already on the list
    if (err.code === "23505") {
      return res.status(409).json({ duplicate: true });
    }
    console.error("Waitlist insert error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
