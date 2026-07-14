import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleAuthButton from "@/components/GoogleAuthButton";

// ── Floating particles — same as WaitlistLanding ──────────────────────────────
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

export default function AdminLogin() {
  const { t } = useTranslation();
  const { login, loginAdminWithGoogle } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/admin");
    } catch (err) {
      toast({ title: "Access denied", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0c0a14 0%, #11091a 50%, #0a0c18 100%)"
          : "linear-gradient(135deg, hsl(265 45% 96%) 0%, hsl(300 35% 94%) 50%, hsl(250 40% 95%) 100%)",
      }}
    >
      {/* ── Ambient glow blobs ─────────────────────────────────────────── */}
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

      {/* ── Floating particles ─────────────────────────────────────────── */}
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

      {/* ── Top bar: theme toggle + language switcher ──────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div
          className="text-xs font-bold tracking-widest uppercase select-none"
          style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(109,40,217,0.4)" }}
        >
          cosmeo
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      {/* ── Centered form ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm flex flex-col items-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <BrandMark className="h-16 w-16" />
          </motion.div>

          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
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
              Admin Access
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-2 text-2xl font-black leading-tight text-center"
            style={{
              color: isDark ? "#ffffff" : "#1e1b4b",
              textShadow: isDark ? "0 0 40px rgba(192,132,252,0.3)" : "none",
            }}
          >
            {t("signInTitle")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-[13px] text-center font-medium"
            style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(109,40,217,0.55)" }}
          >
            Restricted — authorized personnel only
          </motion.p>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="w-full rounded-3xl p-6 flex flex-col gap-4"
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
              border: isDark ? "1px solid rgba(192,132,252,0.12)" : "1px solid rgba(192,132,252,0.25)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Google sign-in — same button, styling, loading/hover/error
                behavior as the main site; the backend enforces that only
                the authorized admin Google account can actually succeed. */}
            <GoogleAuthButton
              authFn={loginAdminWithGoogle}
              errorTitle="Admin sign-in failed"
              onSuccess={() => setLocation("/admin")}
            />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(109,40,217,0.15)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(109,40,217,0.55)" }}
              >
                {t("orDivider", "or")}
              </span>
              <div className="h-px flex-1" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(109,40,217,0.15)" }} />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-email"
                  className="text-[12px] font-bold tracking-wide uppercase"
                  style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(109,40,217,0.6)" }}
                >
                  {t("email")}
                </label>
                <input
                  id="admin-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  data-testid="input-login-email"
                  className="w-full rounded-2xl px-4 py-3.5 text-[14px] font-semibold outline-none transition-all"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
                    color: isDark ? "#ffffff" : "#1e1b4b",
                    border: isDark ? "1px solid rgba(192,132,252,0.18)" : "1px solid rgba(192,132,252,0.3)",
                    caretColor: "#a855f7",
                  }}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="admin-password"
                    className="text-[12px] font-bold tracking-wide uppercase"
                    style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(109,40,217,0.6)" }}
                  >
                    {t("password")}
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    data-testid="input-login-password"
                    className="w-full rounded-2xl px-4 py-3.5 pr-11 text-[14px] font-semibold outline-none transition-all"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
                      color: isDark ? "#ffffff" : "#1e1b4b",
                      border: isDark ? "1px solid rgba(192,132,252,0.18)" : "1px solid rgba(192,132,252,0.3)",
                      caretColor: "#a855f7",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(109,40,217,0.45)" }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button — exact waitlist gradient */}
              <button
                type="submit"
                disabled={loading}
                data-testid="btn-login-submit"
                className="relative w-full overflow-hidden rounded-2xl py-4 text-[14px] font-black text-white transition-all disabled:opacity-70 active:scale-[0.98] mt-1"
                style={{
                  background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  boxShadow: "0 4px 32px rgba(168,85,247,0.45), 0 0 0 1px rgba(168,85,247,0.2)",
                }}
              >
                {/* Shimmer */}
                {!loading && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "ag-shimmer 2.4s ease-in-out infinite",
                    }}
                  />
                )}
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {t("signingIn")}
                  </span>
                ) : (
                  t("signInBtn")
                )}
              </button>
            </form>
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-[11px] text-center font-medium"
            style={{ color: isDark ? "rgba(255,255,255,0.2)" : "rgba(109,40,217,0.3)" }}
          >
            No spam. Unsubscribe anytime.
          </motion.p>
        </motion.div>
      </div>

      {/* ── Bottom wordmark ────────────────────────────────────────────── */}
      <div className="relative z-10 pb-8 text-center">
        <p
          className="text-[11px] tracking-widest font-bold uppercase"
          style={{ color: isDark ? "rgba(255,255,255,0.12)" : "rgba(109,40,217,0.2)" }}
        >
          cosmeo &mdash; Georgia's Cosplay Marketplace
        </p>
      </div>

      {/* ── Keyframe animations ────────────────────────────────────────── */}
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
