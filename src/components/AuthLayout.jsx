import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ── Floating particles (same as AdminLogin / WaitlistLanding) ─────────────────
const PARTICLES = [
  { top: "10%",  left: "7%",  size: 2.5, delay: "0s",   dur: "6s"  },
  { top: "22%",  left: "90%", size: 2,   delay: "1.4s", dur: "8s"  },
  { top: "68%",  left: "4%",  size: 2,   delay: "2.6s", dur: "7s"  },
  { top: "80%",  left: "91%", size: 3,   delay: "0.8s", dur: "9s"  },
  { top: "48%",  left: "96%", size: 1.5, delay: "3.2s", dur: "5s"  },
  { top: "88%",  left: "28%", size: 2,   delay: "1.8s", dur: "7s"  },
  { top: "6%",   left: "52%", size: 1.5, delay: "4.2s", dur: "6s"  },
  { top: "52%",  left: "1%",  size: 2.5, delay: "2.2s", dur: "8s"  },
];

/**
 * Shared auth shell — matches the Secret Admin Gate visual design.
 *
 * Props
 *   title      – main heading rendered above the card
 *   subtitle   – smaller line below the heading
 *   badge      – optional pill label (e.g. "Welcome back")
 *   backHref   – shows a ← back link in the top-left corner
 *   backLabel  – label for the back link
 *   footer     – node rendered below the card (links, fine-print, etc.)
 *   noCard     – when true children render without the frosted card wrapper
 *                (use for icon-only status screens)
 */
export default function AuthLayout({
  children,
  title,
  subtitle,
  badge,
  backHref,
  backLabel,
  footer,
  noCard,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0c0a14 0%, #11091a 50%, #0a0c18 100%)"
          : "linear-gradient(135deg, hsl(265 45% 96%) 0%, hsl(300 35% 94%) 50%, hsl(250 40% 95%) 100%)",
      }}
    >
      {/* ── Ambient glow blobs ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full"
          style={{
            opacity: isDark ? 0.07 : 0.25,
            background: "radial-gradient(circle, #c084fc 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-16 h-[400px] w-[400px] rounded-full"
          style={{
            opacity: isDark ? 0.06 : 0.18,
            background: "radial-gradient(circle, #f472b6 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full"
          style={{
            opacity: isDark ? 0.04 : 0.12,
            background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Floating particles ─────────────────────────────────────── */}
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
            opacity: isDark ? 0.4 : 0.5,
            animation: `ag-float ${p.dur} ${p.delay} ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 shrink-0">
        {backHref ? (
          <Link href={backHref}>
            <button
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-70
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg px-1 py-0.5"
              style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(109,40,217,0.6)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </button>
          </Link>
        ) : (
          <div
            className="text-[11px] font-bold tracking-widest uppercase select-none"
            style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(109,40,217,0.4)" }}
          >
            cosmeo
          </div>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-y-auto px-5 py-5">
        <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex flex-col items-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5"
            >
              <BrandMark className="h-14 w-14" />
            </motion.div>

            {/* Badge pill */}
            {badge && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                style={{
                  border: "1.5px solid rgba(192,132,252,0.3)",
                  background: "rgba(168,85,247,0.08)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span
                  className="text-[11px] font-bold tracking-widest uppercase"
                  style={{ color: isDark ? "#d8b4fe" : "#7c3aed" }}
                >
                  {badge}
                </span>
              </motion.div>
            )}

            {/* Title */}
            {title && (
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-1.5 text-2xl font-black leading-tight text-center"
                style={{
                  color: isDark ? "#ffffff" : "#1e1b4b",
                  textShadow: isDark ? "0 0 40px rgba(192,132,252,0.3)" : "none",
                }}
              >
                {title}
              </motion.h1>
            )}

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 text-[13px] text-center font-medium leading-snug px-2"
                style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(109,40,217,0.55)" }}
              >
                {subtitle}
              </motion.p>
            )}

            {/* Card (or bare children) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full"
              style={
                noCard
                  ? {}
                  : {
                      background: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.72)",
                      border: isDark
                        ? "1px solid rgba(192,132,252,0.12)"
                        : "1px solid rgba(192,132,252,0.25)",
                      backdropFilter: "blur(16px)",
                      borderRadius: "1.5rem",
                      padding: "1.5rem",
                    }
              }
            >
              {children}
            </motion.div>

            {/* Footer slot */}
            {footer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-5 w-full text-center"
              >
                {footer}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Bottom wordmark ────────────────────────────────────────── */}
      <div className="relative z-10 pb-4 text-center shrink-0">
        <p
          className="text-[11px] tracking-widest font-bold uppercase"
          style={{ color: isDark ? "rgba(255,255,255,0.12)" : "rgba(109,40,217,0.2)" }}
        >
          cosmeo &mdash; Georgia's Cosplay Marketplace
        </p>
      </div>

      {/* ── Keyframe animations ────────────────────────────────────── */}
      <style>{`
        @keyframes ag-float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-14px) scale(1.3); }
        }
        @keyframes ag-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
