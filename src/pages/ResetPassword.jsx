import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuthStyles } from "@/lib/authStyles";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const { t } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const s = useAuthStyles();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setValidating(false); return; }
    api.auth.validateResetToken(token)
      .then(({ valid }) => setTokenValid(valid))
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: t("passwordMismatch"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { user, token: jwt } = await api.auth.resetPassword(token, password);
      localStorage.setItem("kosmeo_token", jwt);
      setUser(user);
      setSuccess(true);
      setTimeout(() => setLocation("/"), 2000);
    } catch (err) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Validating (spinner) ────────────────────────────────────────────────────
  if (validating) {
    return (
      <AuthLayout title={t("setNewPasswordTitle", "Set new password")} badge={t("passwordResetBadge", "Password reset")}>
        <div className="flex items-center justify-center py-8">
          <span
            className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(192,132,252,0.4)", borderTopColor: "#a855f7" }}
          />
        </div>
      </AuthLayout>
    );
  }

  // ── Invalid / expired token ─────────────────────────────────────────────────
  if (!token || !tokenValid) {
    return (
      <AuthLayout
        title={t("linkExpiredTitle")}
        subtitle={t("linkExpiredDesc")}
        badge={t("linkExpiredBadge", "Link expired")}
        backHref="/forgot-password"
        backLabel={t("requestNewLink")}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col gap-4"
        >
          <div className="flex justify-center py-2">
            <div className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center" style={s.iconBoxRed}>
              <XCircle className="h-8 w-8" style={{ color: "rgba(239,68,68,0.85)" }} strokeWidth={1.5} />
            </div>
          </div>
          <button
            onClick={() => setLocation("/forgot-password")}
            className={s.submitClass}
            style={s.submitStyle}
          >
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "ag-shimmer 2.4s ease-in-out infinite",
              }}
            />
            {t("requestNewLink")}
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout
        title={t("passwordSuccessTitle")}
        subtitle={t("passwordSuccessDesc")}
        badge={t("allDoneBadge", "All done")}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center py-4"
        >
          <div className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center" style={s.iconBoxGreen}>
            <CheckCircle2 className="h-8 w-8 text-green-500" strokeWidth={1.5} />
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title={t("setNewPasswordTitle")}
      subtitle={t("setNewPasswordDesc")}
      badge={t("passwordResetBadge", "Password reset")}
      backHref="/login"
      backLabel={t("backToSignIn")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* New password */}
        <div>
          <label htmlFor="new-pw" className={s.labelClass} style={s.labelStyle}>
            {t("newPasswordLabel")}
          </label>
          <div className="relative">
            <input
              id="new-pw"
              type={showPw ? "text" : "password"}
              placeholder={t("newPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={s.inputClass + " pr-11"}
              style={s.inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 focus:outline-none"
              style={{ color: s.isDark ? "rgba(255,255,255,0.35)" : "rgba(109,40,217,0.45)" }}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirm-pw" className={s.labelClass} style={s.labelStyle}>
            {t("confirmPasswordLabel")}
          </label>
          <input
            id="confirm-pw"
            type="password"
            placeholder={t("confirmPasswordPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={s.inputClass}
            style={confirm && password !== confirm ? s.inputErrorStyle : s.inputStyle}
          />
          {confirm && password !== confirm && (
            <p className="text-[12px] font-bold mt-1.5" style={s.errorStyle}>{t("passwordMismatch")}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={s.submitClass + " mt-1"}
          style={s.submitStyle}
          disabled={loading || Boolean(confirm && password !== confirm)}
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
              {t("updatingPassword")}
            </span>
          ) : (
            t("updatePasswordBtn")
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
