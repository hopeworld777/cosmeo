import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuthStyles } from "@/lib/authStyles";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const s = useAuthStyles();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const result = await api.auth.forgotPassword(email);
      setSent(true);
      if (result.devResetLink) setDevLink(result.devResetLink);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <AuthLayout
        title={t("successResetEmail")}
        subtitle={email}
        badge={t("checkInboxBadge", "Check your inbox")}
        backHref="/login"
        backLabel={t("backToSignIn")}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          {/* Icon */}
          <div className="flex justify-center py-2">
            <div
              className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center"
              style={s.iconBoxPurple}
            >
              <Mail className="h-8 w-8" style={{ color: s.isDark ? "#d8b4fe" : "#7c3aed" }} strokeWidth={1.5} />
            </div>
          </div>

          {devLink && (
            <div
              className="rounded-2xl p-4 text-left"
              style={{
                background: s.isDark ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
              }}
            >
              <p className="text-[11px] font-bold mb-2" style={{ color: "rgba(251,191,36,0.9)" }}>
                Dev mode — no SMTP configured
              </p>
              <a href={devLink} className="text-[11px] font-semibold break-all hover:opacity-80" style={s.linkStyle}>
                {devLink}
              </a>
            </div>
          )}

          <Link href="/login">
            <button className={s.outlineClass} style={s.outlineStyle}>
              {t("backToSignIn")}
            </button>
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title={t("forgotPasswordTitle")}
      subtitle={t("forgotPasswordDesc")}
      badge={t("passwordResetBadge", "Password reset")}
      backHref="/login"
      backLabel={t("backToSignIn")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="forgot-email" className={s.labelClass} style={s.labelStyle}>
            {t("email")}
          </label>
          <input
            id="forgot-email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={s.inputClass}
            style={s.inputStyle}
          />
        </div>

        <button
          type="submit"
          className={s.submitClass + " mt-1"}
          style={s.submitStyle}
          disabled={loading}
        >
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
              {t("sending")}
            </span>
          ) : (
            t("resetLinkBtn")
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
