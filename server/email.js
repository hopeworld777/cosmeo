import { Resend } from "resend";

const APP_URL = process.env.CLIENT_URL || "https://www.cosmeo.shop";
const FROM_NAME = "cosmeo";
const FROM_EMAIL = "hello@cosmeo.shop";

if (process.env.RESEND_API_KEY) {
  console.log("[email] RESEND_API_KEY is set — live email enabled");
} else {
  console.warn("[email] RESEND_API_KEY is NOT set — emails will be printed to console only");
}

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

  let data, error;
  try {
    ({ data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    }));
  } catch (err) {
    console.error("Email delivery failed (exception):", err);
    throw err;
  }

  if (error) {
    console.error("Email delivery failed:", JSON.stringify(error, null, 2));
    throw new Error(error.message || "Failed to send email");
  }

  console.log("Email sent successfully to:", to, "| id:", data?.id);
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

export async function sendWaitlistConfirmation(to) {
  await sendEmail({
    to,
    subject: "You're on the list for cosmeo! 🌟",
    text: `You're on the list for cosmeo! 🌟\n\nThanks for signing up! We are currently hand-vetting our first wave of local creators to ensure the marketplace launches with the highest quality gear. We'll send your exclusive access link as soon as a spot opens up!\n\n— The cosmeo team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#faf9ff;border-radius:24px;padding:32px;">
        <h1 style="color:#8b72c8;font-size:28px;margin-bottom:4px;">✨ cosmeo</h1>
        <p style="color:#6b7280;margin-top:0;">Georgia's cosplay marketplace</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <h2 style="color:#111827;font-size:20px;">You're on the list! 🌟</h2>
        <p style="color:#374151;line-height:1.6;">Thanks for signing up! We are currently hand-vetting our first wave of local creators to ensure the marketplace launches with the highest quality gear.</p>
        <p style="color:#374151;line-height:1.6;">We'll send your exclusive access link as soon as a spot opens up!</p>
        <p style="color:#9ca3af;font-size:13px;margin-top:24px;">You're receiving this because you joined the cosmeo waitlist. No spam — ever.</p>
        <p style="color:#d1d5db;font-size:12px;margin-top:8px;">© cosmeo • Where cosplay culture shops</p>
      </div>`,
  });
}

export async function sendWaitlistLinkEmail(to) {
  await sendEmail({
    to,
    subject: "cosmeo is almost live — you're on the list! 🚀",
    text: `Hey there!\n\nWe just wanted to drop in and let you know — cosmeo is almost ready.\n\nWe're putting the final touches on Georgia's first cosplay marketplace and you'll be among the first to know when the doors open.\n\nNo action needed. We'll send you your access link the moment we go live!\n\n— The cosmeo team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#faf9ff;border-radius:24px;padding:32px;">
        <h1 style="color:#8b72c8;font-size:28px;margin-bottom:4px;">✨ cosmeo</h1>
        <p style="color:#6b7280;margin-top:0;">Georgia's cosplay marketplace</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <h2 style="color:#111827;font-size:20px;">You're almost in! 🚀</h2>
        <p style="color:#374151;line-height:1.6;">We just wanted to drop in and let you know — <strong>cosmeo is almost ready.</strong></p>
        <p style="color:#374151;line-height:1.6;">We're putting the final touches on Georgia's first cosplay marketplace and you'll be among the first to know when the doors open.</p>
        <p style="color:#374151;line-height:1.6;background:#f3f0ff;border-radius:12px;padding:14px 18px;">No action needed — we'll send your access link the moment we go live!</p>
        <p style="color:#9ca3af;font-size:13px;margin-top:24px;">You're receiving this because you joined the cosmeo waitlist.</p>
        <p style="color:#d1d5db;font-size:12px;margin-top:8px;">© cosmeo • Where cosplay culture shops</p>
      </div>`,
  });
}

export async function sendWaitlistVipInvite(to, vipCode) {
  const signupUrl = "https://cosmeo.shop/vip-signup";
  await sendEmail({
    to,
    subject: "Your exclusive invite to cosmeo is here! 🌟",
    text: `You're in! 🌟\n\nYou've been hand-selected as one of our first featured creators on cosmeo — Georgia's cosplay marketplace.\n\nHere's how to claim your spot:\n\n1. Go to ${signupUrl}\n2. Enter this secret VIP password when prompted: ${vipCode}\n3. Create your account and set up your creator profile\n\nWe can't wait to see your work on the platform.\n\n— The cosmeo team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#faf9ff;border-radius:24px;padding:32px;">
        <h1 style="color:#8b72c8;font-size:28px;margin-bottom:4px;">✨ cosmeo</h1>
        <p style="color:#6b7280;margin-top:0;">Georgia's cosplay marketplace</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <h2 style="color:#111827;font-size:22px;">You're in! 🌟</h2>
        <p style="color:#374151;line-height:1.6;">You've been <strong>hand-selected</strong> as one of our first featured creators on cosmeo — Georgia's first cosplay marketplace.</p>
        <p style="color:#374151;line-height:1.6;">Here's how to claim your exclusive spot:</p>
        <div style="background:#f3f0ff;border-radius:16px;padding:20px 24px;margin:20px 0;">
          <p style="margin:0 0 10px;color:#374151;font-size:14px;"><strong>Step 1.</strong> Visit the creator signup page:</p>
          <a href="${signupUrl}" style="display:inline-block;background:#8b72c8;color:#fff;font-weight:700;font-size:14px;border-radius:12px;padding:10px 22px;text-decoration:none;margin-bottom:16px;">${signupUrl}</a>
          <p style="margin:0 0 6px;color:#374151;font-size:14px;"><strong>Step 2.</strong> Enter your secret VIP password when prompted:</p>
          <div style="background:#fff;border:2px dashed #8b72c8;border-radius:10px;padding:10px 16px;font-family:monospace;font-size:18px;font-weight:900;color:#8b72c8;letter-spacing:2px;text-align:center;">${vipCode}</div>
          <p style="margin:14px 0 0;color:#374151;font-size:14px;"><strong>Step 3.</strong> Create your profile and start listing your work!</p>
        </div>
        <p style="color:#374151;line-height:1.6;">We can't wait to see your creations on the platform. Welcome to cosmeo. 🎭</p>
        <p style="color:#9ca3af;font-size:13px;margin-top:24px;">You're receiving this because you joined the cosmeo waitlist and were selected as a featured creator.</p>
        <p style="color:#d1d5db;font-size:12px;margin-top:8px;">© cosmeo • Where cosplay culture shops</p>
      </div>`,
  });
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
