import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTheme } from "@/context/ThemeContext";

// ── Design tokens per theme ───────────────────────────────────────────────────
const DARK = {
  bg:           "linear-gradient(135deg, #0c0a14 0%, #11091a 50%, #0a0c18 100%)",
  title:        "#ffffff",
  titleShadow:  "0 0 40px rgba(192,132,252,0.3)",
  subtitle:     "rgba(255,255,255,0.55)",
  wordmark:     "rgba(255,255,255,0.3)",
  privacyNote:  "rgba(255,255,255,0.25)",
  badgeBorder:  "rgba(168,85,247,0.3)",
  badgeBg:      "rgba(168,85,247,0.1)",
  badgeText:    "#d8b4fe",
  badgeDot:     "#a855f7",
  inputBg:      "rgba(255,255,255,0.9)",
  inputText:    "#1e293b",
  inputPlaceholder: "rgba(100,116,139,0.7)",
  inputBorder:  "rgba(255,255,255,0.2)",
  inputFocus:   "rgba(168,85,247,0.6)",
  blob1:        { color: "#c084fc", op: 0.08 },
  blob2:        { color: "#f472b6", op: 0.07 },
  blob3:        { color: "#a855f7", op: 0.04 },
  blob4:        { color: "#a5f3fc", op: 0.05 },
  blob5:        { color: "#fde68a", op: 0.05 },
  logoGlow:     "radial-gradient(circle, #c084fc 0%, #f472b6 60%, transparent 100%)",
  logoGlowOp:   0.2,
  ringColor:    "#c084fc",
  toggleBg:     "rgba(192,132,252,0.12)",
  toggleBorder: "rgba(192,132,252,0.25)",
};

const LIGHT = {
  bg:           "linear-gradient(135deg, #faf7ff 0%, #fff4fb 50%, #f5f4ff 100%)",
  title:        "#1e0a3c",
  titleShadow:  "0 0 40px rgba(168,85,247,0.12)",
  subtitle:     "rgba(30,10,60,0.55)",
  wordmark:     "rgba(30,10,60,0.25)",
  privacyNote:  "rgba(30,10,60,0.3)",
  badgeBorder:  "rgba(168,85,247,0.35)",
  badgeBg:      "rgba(168,85,247,0.08)",
  badgeText:    "#7c3aed",
  badgeDot:     "#a855f7",
  inputBg:      "rgba(255,255,255,0.95)",
  inputText:    "#1e293b",
  inputPlaceholder: "rgba(100,116,139,0.6)",
  inputBorder:  "rgba(168,85,247,0.25)",
  inputFocus:   "rgba(168,85,247,0.5)",
  blob1:        { color: "#c084fc", op: 0.12 },
  blob2:        { color: "#f472b6", op: 0.1  },
  blob3:        { color: "#a855f7", op: 0.06 },
  blob4:        { color: "#a5f3fc", op: 0.08 },
  blob5:        { color: "#fde68a", op: 0.07 },
  logoGlow:     "radial-gradient(circle, #c084fc 0%, #f472b6 60%, transparent 100%)",
  logoGlowOp:   0.15,
  ringColor:    "#a855f7",
  toggleBg:     "rgba(168,85,247,0.1)",
  toggleBorder: "rgba(168,85,247,0.3)",
};

// ── 4-pointed sparkle SVG ─────────────────────────────────────────────────────
function Sparkle({ size = 14, color = "#c084fc", opacity = 0.7 }) {
  const half = size / 2;
  const thin = size * 0.08;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", opacity }} aria-hidden="true">
      <path
        d={`M${half},0 C${half},${half - thin} ${half + thin},${half} ${size},${half} C${half + thin},${half} ${half},${half + thin} ${half},${size} C${half},${half + thin} ${half - thin},${half} 0,${half} C${half - thin},${half} ${half},${half - thin} ${half},0 Z`}
        fill={color}
      />
    </svg>
  );
}

// Sparkle positions — outer ring of the page, away from center content
const SPARKLES = [
  { top:  6, left:  4, size: 18, color: "#c084fc", op: 0.55, delay: "0s",    dur: "4.5s" },
  { top: 14, left: 14, size:  9, color: "#f472b6", op: 0.4,  delay: "1.2s",  dur: "6s"   },
  { top:  3, left: 28, size: 12, color: "#a5f3fc", op: 0.3,  delay: "2.8s",  dur: "5s"   },
  { top: 22, left:  3, size:  7, color: "#fde68a", op: 0.45, delay: "0.7s",  dur: "7s"   },
  { top: 36, left:  8, size: 15, color: "#c084fc", op: 0.45, delay: "3.5s",  dur: "5.5s" },
  { top:  5, left: 72, size: 10, color: "#f472b6", op: 0.5,  delay: "1.5s",  dur: "5s"   },
  { top: 10, left: 85, size: 20, color: "#c084fc", op: 0.55, delay: "0s",    dur: "4s"   },
  { top:  2, left: 91, size:  8, color: "#fde68a", op: 0.35, delay: "2s",    dur: "6.5s" },
  { top: 20, left: 94, size: 13, color: "#a5f3fc", op: 0.35, delay: "3.2s",  dur: "5s"   },
  { top: 32, left: 88, size:  7, color: "#f472b6", op: 0.45, delay: "0.5s",  dur: "7s"   },
  { top: 64, left:  5, size: 16, color: "#f472b6", op: 0.5,  delay: "1.8s",  dur: "5.5s" },
  { top: 75, left: 14, size:  9, color: "#c084fc", op: 0.4,  delay: "3s",    dur: "4.5s" },
  { top: 85, left:  4, size: 12, color: "#fde68a", op: 0.35, delay: "0.4s",  dur: "6s"   },
  { top: 93, left: 22, size:  8, color: "#a5f3fc", op: 0.3,  delay: "2.2s",  dur: "5s"   },
  { top: 58, left: 10, size: 10, color: "#c084fc", op: 0.35, delay: "4s",    dur: "7s"   },
  { top: 62, left: 90, size: 14, color: "#a5f3fc", op: 0.45, delay: "1s",    dur: "5s"   },
  { top: 78, left: 84, size: 20, color: "#c084fc", op: 0.5,  delay: "2.6s",  dur: "4s"   },
  { top: 88, left: 92, size:  9, color: "#f472b6", op: 0.4,  delay: "0.2s",  dur: "6s"   },
  { top: 96, left: 74, size: 12, color: "#fde68a", op: 0.35, delay: "3.8s",  dur: "5.5s" },
  { top: 70, left: 96, size:  7, color: "#c084fc", op: 0.3,  delay: "1.6s",  dur: "7s"   },
  { top: 47, left:  2, size: 11, color: "#f472b6", op: 0.35, delay: "0.9s",  dur: "6s"   },
  { top: 50, left: 97, size:  9, color: "#c084fc", op: 0.35, delay: "2.4s",  dur: "5.5s" },
];

const DOTS = [
  { top:  9, left: 42, size: 2.5, color: "#c084fc", delay: "0.3s",  dur: "5s"   },
  { top: 18, left: 62, size: 2,   color: "#f472b6", delay: "1.4s",  dur: "7s"   },
  { top: 30, left: 78, size: 1.5, color: "#a5f3fc", delay: "2.1s",  dur: "6s"   },
  { top: 42, left: 18, size: 2,   color: "#fde68a", delay: "3.3s",  dur: "8s"   },
  { top: 56, left: 32, size: 2.5, color: "#c084fc", delay: "0.8s",  dur: "5.5s" },
  { top: 68, left: 55, size: 2,   color: "#f472b6", delay: "1.9s",  dur: "7s"   },
  { top: 80, left: 42, size: 1.5, color: "#a5f3fc", delay: "0.1s",  dur: "6.5s" },
  { top: 91, left: 60, size: 2,   color: "#c084fc", delay: "2.7s",  dur: "5s"   },
  { top: 15, left: 36, size: 1.5, color: "#fde68a", delay: "3.9s",  dur: "7.5s" },
  { top: 72, left: 72, size: 2,   color: "#c084fc", delay: "1.1s",  dur: "6s"   },
  { top: 48, left: 64, size: 1.5, color: "#f472b6", delay: "4.2s",  dur: "5s"   },
  { top: 25, left: 48, size: 2,   color: "#a5f3fc", delay: "2.5s",  dur: "8s"   },
];

const RINGS = [
  { top: "8%",  left: "5%",  size: 120, delay: "0s",   dur: "8s"  },
  { top: "80%", left: "88%", size: 150, delay: "2s",   dur: "10s" },
  { top: "55%", left: "2%",  size:  90, delay: "4s",   dur: "7s"  },
  { top: "15%", left: "85%", size: 100, delay: "1.5s", dur: "9s"  },
];

// ── Cosmos-styled theme toggle ────────────────────────────────────────────────
function WaitlistThemeToggle({ tok }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      className="relative h-[34px] w-[34px] rounded-full flex items-center justify-center shrink-0 transition-colors"
      style={{ background: tok.toggleBg, border: `1px solid ${tok.toggleBorder}` }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span key="sun"
            initial={{ opacity: 0, rotate: -60, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1   }}
            exit={{    opacity: 0, rotate:  60, scale: 0.5 }}
            transition={{ duration: 0.22 }}
            className="absolute" style={{ lineHeight: 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#fde68a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2"  x2="12" y2="5"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="4.22" y1="4.22"  x2="6.34" y2="6.34"/>
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
              <line x1="2"  y1="12" x2="5"  y2="12"/>
              <line x1="19" y1="12" x2="22" y2="12"/>
              <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66"/>
              <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
            </svg>
          </motion.span>
        ) : (
          <motion.span key="moon"
            initial={{ opacity: 0, rotate: 60,  scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1   }}
            exit={{    opacity: 0, rotate: -60, scale: 0.5 }}
            transition={{ duration: 0.22 }}
            className="absolute" style={{ lineHeight: 1 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WaitlistLanding() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tok = isDark ? DARK : LIGHT;

  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || status === "submitting") return;
    setStatus("submitting");
    const result = await api.waitlist.join(email.trim());
    if (result.duplicate)  setStatus("duplicate");
    else if (result.ok)    setStatus("success");
    else                   setStatus("idle");
  };

  const isDuplicate  = status === "duplicate";
  const isSuccess    = status === "success";
  const isSubmitting = status === "submitting";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      animate={{ background: tok.bg }}
      transition={{ duration: 0.5 }}
      style={{ background: tok.bg }}
    >
      {/* ── Ambient glow blobs ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full"
          style={{ background: `radial-gradient(circle, ${tok.blob1.color} 0%, transparent 70%)`, opacity: tok.blob1.op }} />
        <div className="absolute -bottom-32 -right-16 h-[400px] w-[400px] rounded-full"
          style={{ background: `radial-gradient(circle, ${tok.blob2.color} 0%, transparent 70%)`, opacity: tok.blob2.op }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full"
          style={{ background: `radial-gradient(circle, ${tok.blob3.color} 0%, transparent 70%)`, opacity: tok.blob3.op }} />
        <div className="absolute top-0 right-0 h-[300px] w-[300px] rounded-full"
          style={{ background: `radial-gradient(circle, ${tok.blob4.color} 0%, transparent 70%)`, opacity: tok.blob4.op }} />
        <div className="absolute bottom-0 left-0 h-[250px] w-[250px] rounded-full"
          style={{ background: `radial-gradient(circle, ${tok.blob5.color} 0%, transparent 70%)`, opacity: tok.blob5.op }} />
      </div>

      {/* ── Pulsing ring halos ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {RINGS.map((r, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              top: r.top, left: r.left,
              width: r.size, height: r.size,
              border: `1px solid ${tok.ringColor}`,
              opacity: isDark ? 0.07 : 0.12,
              transform: "translate(-50%, -50%)",
              animation: `wl-pulse ${r.dur} ${r.delay} ease-in-out infinite alternate`,
            }} />
        ))}
      </div>

      {/* ── Tiny glitter dots ────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {DOTS.map((d, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              top: `${d.top}%`, left: `${d.left}%`,
              width: d.size, height: d.size,
              background: d.color,
              opacity: isDark ? 0.35 : 0.45,
              animation: `wl-twinkle ${d.dur} ${d.delay} ease-in-out infinite alternate`,
            }} />
        ))}
      </div>

      {/* ── 4-pointed sparkles ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {SPARKLES.map((s, i) => (
          <div key={i} className="absolute"
            style={{
              top: `${s.top}%`, left: `${s.left}%`,
              transform: "translate(-50%, -50%)",
              animation: `wl-sparkle-float ${s.dur} ${s.delay} ease-in-out infinite alternate`,
            }}>
            <Sparkle size={s.size} color={s.color} opacity={isDark ? s.op : s.op * 1.3} />
          </div>
        ))}
      </div>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-xs font-bold tracking-widest uppercase select-none"
          style={{ color: tok.wordmark }}>
          cosmeo
        </div>
        <div className="flex items-center gap-2">
          <WaitlistThemeToggle tok={tok} />
          <LanguageSwitcher />
        </div>
      </div>

      {/* ── Main centered content ─────────────────────────────────────── */}
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
            className="mb-6 relative"
          >
            <div className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: tok.logoGlow, opacity: tok.logoGlowOp, transform: "scale(1.6)" }} />
            <img src="/waitlist-logo-v2.png" alt="Cosmeo"
              className="relative h-[144px] w-[144px] object-contain" />
          </motion.div>

          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ border: `1px solid ${tok.badgeBorder}`, background: tok.badgeBg }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: tok.badgeDot }} />
            <span className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: tok.badgeText }}>
              {t("waitlistComingSoon")}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mb-4 text-[28px] font-black leading-[1.15]"
            style={{ color: tok.title, textShadow: tok.titleShadow }}
          >
            {t("waitlistHeadline")}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
            className="mb-8 text-[14px] leading-relaxed font-medium"
            style={{ color: tok.subtitle }}
          >
            {t("waitlistSubtitle")}
          </motion.p>

          {/* Form / success state */}
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
                className="w-full flex flex-col items-center gap-3"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg, #c084fc22, #f472b622)", border: "1.5px solid #c084fc55" }}>
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-[16px] font-bold" style={{ color: tok.title }}>
                  {t("waitlistSuccess")}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form" onSubmit={handleSubmit}
                className="w-full flex flex-col gap-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (isDuplicate) setStatus("idle"); }}
                    placeholder={t("waitlistEmailPlaceholder")}
                    required
                    autoComplete="email"
                    className="w-full rounded-2xl px-5 py-4 text-[14px] font-semibold outline-none transition-all"
                    style={{
                      background:   tok.inputBg,
                      color:        tok.inputText,
                      border:       `1.5px solid ${isDuplicate ? "rgba(239,68,68,0.6)" : tok.inputBorder}`,
                      backdropFilter: "blur(12px)",
                    }}
                  />
                </div>

                <AnimatePresence>
                  {isDuplicate && (
                    <motion.p key="dup"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[12.5px] font-semibold text-rose-500 text-center"
                    >
                      {t("waitlistDuplicate")}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative w-full overflow-hidden rounded-2xl py-4 text-[14px] font-black text-white transition-all disabled:opacity-70 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                    boxShadow: "0 4px 32px rgba(168,85,247,0.45), 0 0 0 1px rgba(168,85,247,0.2)",
                  }}
                >
                  {!isSubmitting && (
                    <span className="pointer-events-none absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                        backgroundSize: "200% 100%",
                        animation: "wl-shimmer 2.4s ease-in-out infinite",
                      }} />
                  )}
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t("waitlistSubmitting")}
                    </span>
                  ) : t("waitlistCta")}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Privacy note */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-6 text-[11px] font-medium"
            style={{ color: tok.privacyNote }}
          >
            No spam. Unsubscribe anytime.
          </motion.p>
        </motion.div>
      </div>

      {/* ── Bottom wordmark ───────────────────────────────────────────── */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-[11px] tracking-widest font-bold uppercase"
          style={{ color: tok.wordmark }}>
          cosmeo &mdash; Georgia's Cosplay Marketplace
        </p>
      </div>

      {/* ── Keyframes ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes wl-sparkle-float {
          0%   { transform: translate(-50%,-50%) translateY(0)    scale(1)    rotate(0deg);  }
          100% { transform: translate(-50%,-50%) translateY(-12px) scale(1.15) rotate(15deg); }
        }
        @keyframes wl-twinkle {
          0%   { transform: scale(1);   opacity: 0.35; }
          50%  { opacity: 0.12; }
          100% { transform: scale(1.6); opacity: 0.5; }
        }
        @keyframes wl-pulse {
          0%   { transform: translate(-50%,-50%) scale(1);    opacity: 0.07; }
          100% { transform: translate(-50%,-50%) scale(1.25); opacity: 0.01; }
        }
        @keyframes wl-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
