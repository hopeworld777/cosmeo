import { Resend } from "resend";

const APP_URL = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "localhost:5000"}`;
const FROM_NAME = "Cosmeo";
const FROM_EMAIL = "onboarding@resend.dev";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    console.log("\n📧 ─────────────────────────────────────────────");
    console.log(`📧  DEV EMAIL (no RESEND_API_KEY configured)`);
    console.log(`📧  To:      ${to}`);
    console.log(`📧  Subject: ${subject}`);
    console.log(`📧  Body:\n${text}`);
    console.log("📧 ─────────────────────────────────────────────\n");
    return { devMode: true };
  }

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email");
  }

  return data;
}

// ─── Email templates ──────────────────────────────────────────────────────────

export async function sendVerificationEmail(to, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your Cosmeo account",
    text: `Welcome to Cosmeo!\n\nPlease verify your email address by clicking the link below:\n\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#faf9ff;border-radius:24px;padding:32px;">
        <h1 style="color:#8b72c8;font-size:28px;margin-bottom:4px;">✨ Cosmeo</h1>
        <p style="color:#6b7280;margin-top:0;">The cosplay marketplace</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <h2 style="color:#111827;font-size:20px;">Verify your email</h2>
        <p style="color:#374151;line-height:1.6;">Thanks for signing up! Click the button below to verify your email address and unlock full access to Cosmeo.</p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#8b72c8;color:#fff;font-weight:700;font-size:16px;border-radius:16px;text-decoration:none;">Verify Email</a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <p style="color:#d1d5db;font-size:12px;margin-top:24px;">© Cosmeo • Where cosplay culture shops</p>
      </div>`,
  });
  return link;
}

export async function sendPasswordResetEmail(to, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your Cosmeo password",
    text: `Reset your password\n\nClick the link below to set a new password:\n\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#faf9ff;border-radius:24px;padding:32px;">
        <h1 style="color:#8b72c8;font-size:28px;margin-bottom:4px;">✨ Cosmeo</h1>
        <p style="color:#6b7280;margin-top:0;">The cosplay marketplace</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <h2 style="color:#111827;font-size:20px;">Reset your password</h2>
        <p style="color:#374151;line-height:1.6;">We received a request to reset your password. Click below to choose a new one.</p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#8b72c8;color:#fff;font-weight:700;font-size:16px;border-radius:16px;text-decoration:none;">Reset Password</a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#d1d5db;font-size:12px;margin-top:24px;">© Cosmeo • Where cosplay culture shops</p>
      </div>`,
  });
  return link;
}
