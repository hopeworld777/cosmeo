import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Mail, CheckCircle2, Loader2, ShieldCheck, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import AuthLayout from "@/components/AuthLayout";

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

export default function Register() {
  const { t } = useTranslation();
  const { register, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  // Revoke object URL on cleanup to avoid memory leaks
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  function clearFieldError(field) {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "email") setEmailTaken(false);
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Only image files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
    setAvatarError("");
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Collect all validation errors before bailing
    const errors = { username: "", email: "", password: "", general: "" };
    if (!username.trim()) errors.username = t("usernameRequired");
    if (!email.trim()) errors.email = t("emailRequired");
    else if (!isValidEmail(email)) errors.email = t("emailInvalid");
    if (!password) errors.password = t("passwordRequired");
    else if (password.length < 6) errors.password = t("passwordTooShort");

    const hasFieldErrors = errors.username || errors.email || errors.password;
    if (hasFieldErrors) setFieldErrors(errors);
    if (!avatarFile) setAvatarError("A profile photo is required.");
    if (!ageConfirmed) setAgeError(true);
    if (hasFieldErrors || !avatarFile || !ageConfirmed) return;

    setFieldErrors({ username: "", email: "", password: "", general: "" });
    setEmailTaken(false);
    setAgeError(false);
    setLoading(true);

    try {
      // Register the user — JWT is stored in localStorage after this resolves
      const u = await register(username.trim(), email.trim(), password);

      // Upload avatar now that we have a valid session token
      try {
        const { avatar_url } = await api.upload.avatar(avatarFile);
        setUser({ ...u, avatar_url });
      } catch (avatarErr) {
        console.error("Avatar upload failed:", avatarErr.message);
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

  if (registered) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full text-center"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Mail className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">{t("checkInbox")}</h2>
          <p className="text-muted-foreground text-sm mb-1 font-medium">{t("verificationSentTo")}</p>
          <p className="text-primary font-bold text-sm mb-8">{email}</p>

          <div className="bg-white rounded-3xl p-6 card-shadow md:bg-muted/30 space-y-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground font-medium">{t("verifyClickLink")}</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground font-medium">{t("browseWhileUnverified")}</p>
            </div>
          </div>

          <Button
            onClick={async () => {
              // Re-fetch from the server before navigating so that email
              // verification done in another tab is reflected immediately.
              try {
                const me = await api.auth.me();
                setUser(me);
              } catch {
                // Non-fatal — navigate anyway if the refresh fails.
              }
              setLocation("/");
            }}
            className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary mb-3"
          >
            {t("continueToCosmeo")}
          </Button>
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full h-10 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {resending ? t("sending") : t("resendEmail")}
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {/* Logo — mobile only */}
        <div className="md:hidden text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-black text-foreground">Cosmeo</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">{t("authTitle")}</p>
        </div>

        {/* Desktop heading */}
        <div className="hidden md:block mb-8">
          <h2 className="text-3xl font-black text-foreground mb-2">{t("authTitle")}</h2>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl p-6 card-shadow md:bg-transparent md:p-0 md:shadow-none md:rounded-none space-y-4">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* ── Profile photo ─────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={loading}
                className={`relative focus:outline-none group rounded-full transition-all ${
                  avatarError ? "ring-2 ring-destructive ring-offset-2" : ""
                }`}
                aria-label="Upload profile photo"
              >
                <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border-4 border-white shadow-lg flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-7 w-7 text-muted-foreground/40" />
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center shadow-md transition-colors ${
                    avatarFile ? "bg-secondary" : "bg-primary"
                  } group-hover:opacity-80`}
                >
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {avatarError ? (
                <p className="text-xs text-destructive font-medium">{avatarError}</p>
              ) : (
                <p className="text-xs text-muted-foreground font-medium">
                  {avatarFile ? "Photo selected ✓" : "Upload a profile photo"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-username" className="font-bold">{t("username")}</Label>
              <Input
                id="reg-username"
                placeholder={t("usernamePlaceholder")}
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearFieldError("username"); }}
                autoComplete="username"
                className={`h-12 rounded-2xl ${fieldErrors.username ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={loading}
                data-testid="input-register-username"
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive font-medium pl-1">{fieldErrors.username}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-email" className="font-bold">{t("email")}</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                autoComplete="email"
                className={`h-12 rounded-2xl ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={loading}
                data-testid="input-register-email"
              />
              {fieldErrors.email && (
                <div className="pl-1">
                  <p className="text-xs text-destructive font-medium">{fieldErrors.email}</p>
                  {emailTaken && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Link href="/login" className="text-primary font-semibold hover:underline">
                        Log in instead →
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="reg-password" className="font-bold">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                  autoComplete="new-password"
                  className={`h-12 rounded-2xl pr-11 ${fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  disabled={loading}
                  data-testid="input-register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive font-medium pl-1">{fieldErrors.password}</p>
              )}
            </div>

            <div
              className={`flex items-start gap-3 rounded-2xl border p-3 ${
                ageError ? "border-destructive bg-destructive/5" : "border-border/50 bg-muted/40"
              }`}
            >
              <input
                id="age-confirm"
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => { setAgeConfirmed(e.target.checked); if (e.target.checked) setAgeError(false); }}
                disabled={loading}
                className="mt-0.5 h-4 w-4 accent-primary shrink-0 cursor-pointer"
              />
              <label
                htmlFor="age-confirm"
                className={`text-xs leading-snug cursor-pointer select-none ${ageError ? "text-destructive font-medium" : "text-muted-foreground"}`}
              >
                {t("ageConfirmCheckbox")}
              </label>
            </div>
            {ageError && (
              <p className="text-xs text-destructive text-center -mt-1 font-medium">{t("ageConfirmRequired")}</p>
            )}

            <p className="text-center text-xs text-muted-foreground -mt-1">
              <Link href="/terms" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />{t("readSafetyGuide")}
              </Link>
            </p>

            {fieldErrors.general && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-xs text-destructive font-medium">{fieldErrors.general}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary"
              disabled={loading}
              data-testid="btn-register-submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creatingAccount")}
                </span>
              ) : t("createAccountBtn")}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground pt-1">
            {t("termsNoticePrefix")}{" "}
            <Link href="/terms" className="underline text-primary font-semibold">
              {t("termsNoticeLinkText")}
            </Link>
            .
          </p>
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          <Link href="/login">
            <span className="text-primary font-semibold cursor-pointer hover:underline">
              {t("alreadyHaveAccount")}
            </span>
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
