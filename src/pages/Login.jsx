import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuthStyles } from "@/lib/authStyles";
import AuthLayout from "@/components/AuthLayout";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const s = useAuthStyles();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("signInTitle")}
      subtitle={t("authSubtitle", "Your cosplay world awaits")}
      badge={t("welcomeBackBadge", "Welcome back")}
      footer={
        <p className="text-[13px] font-medium" style={s.mutedStyle}>
          {t("noAccountYet", "No account yet?")}{" "}
          <Link href="/register">
            <span className="font-bold cursor-pointer hover:opacity-80 transition-opacity" style={s.linkStyle}>
              {t("createOne", "Create one")}
            </span>
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4 mb-2">
        <GoogleAuthButton onSuccess={() => setLocation("/")} />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: s.isDark ? "rgba(255,255,255,0.12)" : "rgba(109,40,217,0.15)" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={s.mutedStyle}>{t("orDivider", "or")}</span>
          <div className="h-px flex-1" style={{ background: s.isDark ? "rgba(255,255,255,0.12)" : "rgba(109,40,217,0.15)" }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div>
          <label htmlFor="login-email" className={s.labelClass} style={s.labelStyle}>
            {t("email")}
          </label>
          <input
            id="login-email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            data-testid="input-login-email"
            className={s.inputClass}
            style={s.inputStyle}
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className={s.labelClass} style={{ ...s.labelStyle, marginBottom: 0 }}>
              {t("password")}
            </label>
            <Link href="/forgot-password">
              <span
                className="text-[11px] font-bold tracking-wide uppercase cursor-pointer hover:opacity-70 transition-opacity"
                style={s.linkStyle}
              >
                {t("forgotPassword")}
              </span>
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              data-testid="input-login-password"
              className={s.inputClass + " pr-11"}
              style={s.inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 focus:outline-none"
              style={{ color: s.isDark ? "rgba(255,255,255,0.35)" : "rgba(109,40,217,0.45)" }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          data-testid="btn-login-submit"
          className={s.submitClass + " mt-1"}
          style={s.submitStyle}
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
    </AuthLayout>
  );
}
