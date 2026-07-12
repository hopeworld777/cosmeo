import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, Loader2, ShieldCheck, Camera, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { prepareImageFile } from "@/lib/imageUtils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuthStyles } from "@/lib/authStyles";
import AuthLayout from "@/components/AuthLayout";

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

export default function Register() {
  const { t } = useTranslation();
  const { register, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const s = useAuthStyles();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ username: "", email: "", password: "", general: "" });
  const [emailTaken, setEmailTaken] = useState(false);

  // Avatar state
  const avatarInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  function clearFieldError(field) {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "email") setEmailTaken(false);
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsConverting(true);
    try {
      const prepared = await prepareImageFile(file);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(URL.createObjectURL(prepared));
      setAvatarFile(prepared);
      setAvatarError("");
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = { username: "", email: "", password: "", general: "" };
    if (!username.trim()) errors.username = t("usernameRequired");
    if (!email.trim()) errors.email = t("emailRequired");
    else if (!isValidEmail(email)) errors.email = t("emailInvalid");
    if (!password) errors.password = t("passwordRequired");
    else if (password.length < 6) errors.password = t("passwordTooShort");

    const hasFieldErrors = errors.username || errors.email || errors.password;
    if (hasFieldErrors) setFieldErrors(errors);
    if (!ageConfirmed) setAgeError(true);
    if (hasFieldErrors || !ageConfirmed) return;

    setFieldErrors({ username: "", email: "", password: "", general: "" });
    setEmailTaken(false);
    setAgeError(false);
    setLoading(true);

    try {
      const u = await register(username.trim(), email.trim(), password);
      if (avatarFile) {
        try {
          const { avatar_url } = await api.upload.avatar(avatarFile);
          setUser({ ...u, avatar_url });
        } catch (avatarErr) {
          toast({
            title: "Photo upload failed",
            description:
              avatarErr.message ||
              "Your account was created but the profile photo couldn't be uploaded. You can add it later in Settings.",
            variant: "destructive",
          });
        }
      }
      setRegistered(true);
    } catch (err) {
      const raw = err.message || "";
      if (raw === "email_taken") {
        setEmailTaken(true);
        setFieldErrors((prev) => ({ ...prev, email: t("emailTaken") }));
      } else if (raw === "username_taken") {
        setFieldErrors((prev) => ({ ...prev, username: "This username is already taken." }));
      } else if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror")) {
        setFieldErrors((prev) => ({ ...prev, general: t("networkError") }));
      } else {
        setFieldErrors((prev) => ({ ...prev, general: raw || "Something went wrong. Please try again." }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.auth.resendVerification();
      toast({ title: t("verificationEmailSent"), description: t("checkYourInboxLink") });
    } catch (err) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  // ── Check-inbox success screen ───────────────────────────────────────────────
  if (registered) {
    return (
      <AuthLayout
        title={t("checkInbox")}
        subtitle={t("verificationSentTo") + " " + email}
        badge={t("almostThere", "Almost there")}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          {/* Steps */}
          <div className="flex flex-col gap-3">
            {[t("verifyClickLink"), t("browseWhileUnverified")].map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl p-3"
                style={{
                  background: s.isDark ? "rgba(34,197,94,0.07)" : "rgba(34,197,94,0.06)",
                  border: s.isDark ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(34,197,94,0.18)",
                }}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium" style={s.mutedStyle}>{text}</p>
              </div>
            ))}
          </div>

          {/* Continue */}
          <button
            onClick={async () => {
              try {
                const me = await api.auth.me();
                setUser(me);
              } catch {
                // Non-fatal
              }
              setLocation("/");
            }}
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
            {t("continueToCosmeo")}
          </button>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40 focus:outline-none"
            style={s.mutedStyle}
          >
            {resending ? t("sending") : t("resendEmail")}
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title={t("authTitle")}
      subtitle={t("authSubtitleRegister", "Join the Georgian cosplay community")}
      badge={t("joinBadge", "Join Cosmeo")}
      footer={
        <p className="text-[13px] font-medium" style={s.mutedStyle}>
          {t("alreadyHaveAccount2", "Already have an account?")}{" "}
          <Link href="/login">
            <span className="font-bold cursor-pointer hover:opacity-80 transition-opacity" style={s.linkStyle}>
              {t("signInLink", "Sign in")}
            </span>
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* ── Avatar picker ──────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 py-1">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-full"
            disabled={loading || isConverting}
            aria-label="Upload profile photo"
          >
            <div
              className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center relative"
              style={{
                background: s.isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)",
                border: avatarError
                  ? "2px solid rgba(239,68,68,0.6)"
                  : s.isDark
                  ? "2px solid rgba(192,132,252,0.25)"
                  : "2px solid rgba(192,132,252,0.4)",
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-7 w-7" style={{ color: s.isDark ? "rgba(192,132,252,0.5)" : "rgba(109,40,217,0.4)" }} />
              )}
              {isConverting && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                  <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            {/* Badge dot */}
            <div
              className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full flex items-center justify-center shadow-md"
              style={{
                background: avatarFile
                  ? "linear-gradient(135deg, #a855f7, #ec4899)"
                  : "linear-gradient(135deg, #a855f7, #6366f1)",
              }}
            >
              <Camera className="h-3 w-3 text-white" />
            </div>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="text-[12px] font-medium" style={avatarError ? { color: "rgba(239,68,68,0.9)" } : s.mutedStyle}>
            {avatarError ? avatarError : avatarFile ? "Photo selected ✓" : "Add a profile photo (optional)"}
          </p>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="reg-username" className={s.labelClass} style={s.labelStyle}>
            {t("username")}
          </label>
          <input
            id="reg-username"
            placeholder={t("usernamePlaceholder")}
            value={username}
            onChange={(e) => { setUsername(e.target.value); clearFieldError("username"); }}
            autoComplete="username"
            className={s.inputClass}
            style={fieldErrors.username ? s.inputErrorStyle : s.inputStyle}
            disabled={loading}
            data-testid="input-register-username"
          />
          {fieldErrors.username && (
            <p className="text-[12px] font-medium mt-1.5" style={s.errorStyle}>{fieldErrors.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className={s.labelClass} style={s.labelStyle}>
            {t("email")}
          </label>
          <input
            id="reg-email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
            autoComplete="email"
            className={s.inputClass}
            style={fieldErrors.email ? s.inputErrorStyle : s.inputStyle}
            disabled={loading}
            data-testid="input-register-email"
          />
          {fieldErrors.email && (
            <div className="mt-1.5">
              <p className="text-[12px] font-medium" style={s.errorStyle}>{fieldErrors.email}</p>
              {emailTaken && (
                <p className="text-[12px] mt-0.5" style={s.mutedStyle}>
                  <Link href="/login" className="font-bold hover:opacity-80" style={s.linkStyle}>
                    Log in instead →
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className={s.labelClass} style={s.labelStyle}>
            {t("password")}
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
              autoComplete="new-password"
              className={s.inputClass + " pr-11"}
              style={fieldErrors.password ? s.inputErrorStyle : s.inputStyle}
              disabled={loading}
              data-testid="input-register-password"
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
          {fieldErrors.password && (
            <p className="text-[12px] font-medium mt-1.5" style={s.errorStyle}>{fieldErrors.password}</p>
          )}
        </div>

        {/* Age confirmation */}
        <div className="flex items-start gap-3 rounded-2xl p-3" style={s.checkboxBoxStyle(ageError)}>
          <input
            id="age-confirm"
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => { setAgeConfirmed(e.target.checked); if (e.target.checked) setAgeError(false); }}
            disabled={loading}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-purple-500"
          />
          <label
            htmlFor="age-confirm"
            className="text-[12px] leading-snug cursor-pointer select-none font-medium"
            style={ageError ? s.errorStyle : s.mutedStyle}
          >
            {t("ageConfirmCheckbox")}
          </label>
        </div>
        {ageError && (
          <p className="text-[12px] text-center -mt-1 font-medium" style={s.errorStyle}>
            {t("ageConfirmRequired")}
          </p>
        )}

        {/* Safety guide link */}
        <p className="text-center text-[12px] -mt-1" style={s.mutedStyle}>
          <Link href="/terms" className="font-bold inline-flex items-center gap-1 hover:opacity-80" style={s.linkStyle}>
            <ShieldCheck className="h-3.5 w-3.5" />{t("readSafetyGuide")}
          </Link>
        </p>

        {/* General error */}
        {fieldErrors.general && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: s.isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <p className="text-[12px] font-medium" style={s.errorStyle}>{fieldErrors.general}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className={s.submitClass}
          style={s.submitStyle}
          disabled={loading}
          data-testid="btn-register-submit"
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
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("creatingAccount")}
            </span>
          ) : (
            t("createAccountBtn")
          )}
        </button>

        {/* Terms */}
        <p className="text-center text-[11px]" style={s.mutedStyle}>
          {t("termsNoticePrefix")}{" "}
          <Link href="/terms" className="font-bold hover:opacity-80" style={s.linkStyle}>
            {t("termsNoticeLinkText")}
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
