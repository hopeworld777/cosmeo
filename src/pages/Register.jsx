import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (!ageConfirmed) {
      setAgeError(true);
      return;
    }
    setAgeError(false);
    setLoading(true);
    try {
      await register(username, email, password);
      setRegistered(true);
    } catch (err) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.auth.resendVerification();
      toast({ title: "Verification email sent", description: "Check your inbox again." });
    } catch (err) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (registered) {
    return (
      <div className="flex flex-col min-h-full bg-background px-6 py-16 justify-center">
        {/* Language switcher */}
        <div className="absolute top-12 right-6 z-50">
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-sm mx-auto text-center"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Mail className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">{t("checkInbox")}</h2>
          <p className="text-muted-foreground text-sm mb-1 font-medium">{t("verificationSentTo")}</p>
          <p className="text-primary font-bold text-sm mb-8">{email}</p>

          <div className="bg-white rounded-3xl p-6 card-shadow space-y-4 text-left mb-6">
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
            onClick={() => setLocation("/")}
            className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary mb-3"
          >
            {t("continueToKosmeo")}
          </Button>
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full h-10 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {resending ? t("sending") : t("resendEmail")}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-full bg-background px-6 pb-12 pt-16 justify-center">
      {/* Language switcher — top-right */}
      <div className="absolute top-12 right-6 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-black text-foreground">Kosmeo</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">{t("authTitle")}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl p-6 card-shadow space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username" className="font-bold">{t("username")}</Label>
              <Input
                id="reg-username"
                placeholder={t("usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-12 rounded-2xl"
                data-testid="input-register-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="font-bold">{t("email")}</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-12 rounded-2xl"
                data-testid="input-register-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="font-bold">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-12 rounded-2xl pr-11"
                  data-testid="input-register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                onChange={(e) => {
                  setAgeConfirmed(e.target.checked);
                  if (e.target.checked) setAgeError(false);
                }}
                className="mt-0.5 h-4 w-4 accent-primary shrink-0 cursor-pointer"
              />
              <label
                htmlFor="age-confirm"
                className={`text-xs leading-snug cursor-pointer select-none ${
                  ageError ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
              >
                {t("ageConfirmCheckbox")}
              </label>
            </div>
            {ageError && (
              <p className="text-xs text-destructive text-center -mt-1 font-medium">
                {t("ageConfirmRequired")}
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground -mt-1">
              <Link href="/terms" className="text-primary font-semibold hover:underline">
                🛡️ {t("readSafetyGuide")}
              </Link>
            </p>
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary"
              disabled={loading}
              data-testid="btn-register-submit"
            >
              {loading ? t("creatingAccount") : t("createAccountBtn")}
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

        {/* Sign-in link */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          <Link href="/login">
            <span className="text-primary font-semibold cursor-pointer hover:underline">
              {t("alreadyHaveAccount")}
            </span>
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
