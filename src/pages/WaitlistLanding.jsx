import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ── Logo mark — inline SVG, crisp at any size, works on dark ──────────────────
function KosmeoLogo({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      {/* Outer glow ring */}
      <circle cx="36" cy="36" r="35" fill="url(#logoGlow)" />
      {/* Hexagon frame */}
      <path
        d="M36 4 L63.7 20 L63.7 52 L36 68 L8.3 52 L8.3 20 Z"
        stroke="url(#logoGrad)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      {/* Stylised K */}
      <text
        x="36"
        y="48"
        textAnchor="middle"
        fontSize="36"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="url(#logoGrad)"
        letterSpacing="-1"
      >K</text>
      {/* Sparkle dots */}
      <circle cx="58" cy="14" r="2.5" fill="#f472b6" opacity="0.8" />
      <circle cx="14" cy="58" r="1.8" fill="#c084fc" opacity="0.6" />
      <circle cx="62" cy="52" r="1.4" fill="#c084fc" opacity="0.5" />
    </svg>
  );
}

// ── Particle dots — pure CSS, no JS animation cost ───────────────────────────
const PARTICLES = [
  { top: "12%",  left: "8%",  size: 3, delay: "0s",   dur: "6s"  },
  { top: "25%",  left: "88%", size: 2, delay: "1.2s", dur: "8s"  },
  { top: "65%",  left: "5%",  size: 2, delay: "2.4s", dur: "7s"  },
  { top: "78%",  left: "92%", size: 3, delay: "0.6s", dur: "9s"  },
  { top: "45%",  left: "95%", size: 1.5, delay: "3s", dur: "5s"  },
  { top: "90%",  left: "30%", size: 2, delay: "1.8s", dur: "7s"  },
  { top: "8%",   left: "55%", size: 1.5, delay: "4s", dur: "6s"  },
  { top: "55%",  left: "2%",  size: 2.5, delay: "2s", dur: "8s"  },
];

export default function WaitlistLanding() {
  const { t } = useTranslation();
  const [email, setEmail]     = useState("");
  const [status, setStatus]   = useState("idle"); // idle | submitting | success | duplicate | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || status === "submitting") return;
    setStatus("submitting");
    const result = await api.waitlist.join(email.trim());
    if (result.duplicate) {
      setStatus("duplicate");
    } else if (result.ok) {
      setStatus("success");
    } else {
      // Generic server error — re-enable form so user can retry
      setStatus("idle");
    }
  };

  const isDuplicate = status === "duplicate";
  const isSuccess   = status === "success";
  const isSubmitting = status === "submitting";

  return (
    // Fixed full-screen overlay — sits above AppShell chrome (DesktopNav z-80)
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0c0a14 0%, #11091a 50%, #0a0c18 100%)" }}
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #c084fc 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-16 h-[400px] w-[400px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #f472b6 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
      </div>

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: i % 2 === 0 ? "#c084fc" : "#f472b6",
            opacity: 0.4,
            animation: `wl-float ${p.dur} ${p.delay} ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Top bar: Language switcher + Sign in link */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-white/30 text-xs font-bold tracking-widest uppercase select-none">
          kosmeo
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/login">
            <span className="text-sm font-semibold text-white/50 hover:text-white/80 transition-colors cursor-pointer">
              {t("waitlistSignIn")} <span className="text-purple-400">{t("signIn")}</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Main centered content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm flex flex-col items-center text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <KosmeoLogo size={76} />
          </motion.div>

          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-purple-300 uppercase">
              Coming Soon
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-4 text-[28px] font-black leading-[1.15] text-white"
            style={{ textShadow: "0 0 40px rgba(192,132,252,0.3)" }}
          >
            {t("waitlistHeadline")}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mb-8 text-[14px] leading-relaxed text-white/55 font-medium"
          >
            {t("waitlistSubtitle")}
          </motion.p>

          {/* Form / success state */}
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full flex flex-col items-center gap-3"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg, #c084fc22, #f472b622)", border: "1.5px solid #c084fc55" }}>
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-[16px] font-bold text-white">
                  {t("waitlistSuccess")}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="w-full flex flex-col gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Email input */}
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (isDuplicate) setStatus("idle"); }}
                    placeholder={t("waitlistEmailPlaceholder")}
                    required
                    autoComplete="email"
                    className={[
                      "w-full rounded-2xl px-5 py-4 text-[14px] font-semibold outline-none transition-all",
                      "bg-white/8 text-white placeholder-white/35",
                      "border focus:ring-0",
                      isDuplicate
                        ? "border-rose-500/60 focus:border-rose-400 bg-rose-500/5"
                        : "border-white/12 focus:border-purple-500/60 hover:border-white/20",
                    ].join(" ")}
                    style={{ backdropFilter: "blur(12px)" }}
                  />
                </div>

                {/* Duplicate error */}
                <AnimatePresence>
                  {isDuplicate && (
                    <motion.p
                      key="dup"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[12.5px] font-semibold text-rose-400 text-center"
                    >
                      {t("waitlistDuplicate")}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* CTA button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative w-full overflow-hidden rounded-2xl py-4 text-[14px] font-black text-white transition-all disabled:opacity-70 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                    boxShadow: "0 4px 32px rgba(168,85,247,0.45), 0 0 0 1px rgba(168,85,247,0.2)",
                  }}
                >
                  {/* Shimmer */}
                  {!isSubmitting && (
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                        backgroundSize: "200% 100%",
                        animation: "wl-shimmer 2.4s ease-in-out infinite",
                      }}
                    />
                  )}
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t("waitlistSubmitting")}
                    </span>
                  ) : (
                    t("waitlistCta")
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Privacy note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-[11px] text-white/25 font-medium"
          >
            No spam. Unsubscribe anytime.
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom wordmark */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-[11px] tracking-widest font-bold text-white/15 uppercase">
          Kosmeo &mdash; Georgia's Cosplay Marketplace
        </p>
      </div>

      {/* Keyframe styles — injected once inline */}
      <style>{`
        @keyframes wl-float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-14px) scale(1.3); }
        }
        @keyframes wl-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
