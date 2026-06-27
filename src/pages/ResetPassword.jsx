import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const { t } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();

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

  if (validating) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (!token || !tokenValid) {
    return (
      <AuthLayout backHref="/forgot-password" backLabel={t("requestNewLink")}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full text-center"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-3">{t("linkExpiredTitle")}</h2>
          <p className="text-muted-foreground text-sm mb-8">{t("linkExpiredDesc")}</p>
          <Button
            onClick={() => setLocation("/forgot-password")}
            className="w-full h-12 rounded-2xl font-bold bg-gradient-to-r from-primary to-secondary"
          >
            {t("requestNewLink")}
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full text-center"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">{t("passwordSuccessTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("passwordSuccessDesc")}</p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backHref="/login" backLabel={t("backToSignIn")}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {/* Header icon + title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <KeyRound className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">{t("setNewPasswordTitle")}</h1>
          <p className="text-muted-foreground text-sm font-medium">{t("setNewPasswordDesc")}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl p-6 card-shadow md:bg-transparent md:p-0 md:shadow-none md:rounded-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw" className="font-bold">{t("newPasswordLabel")}</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showPw ? "text" : "password"}
                  placeholder={t("newPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-2xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pw" className="font-bold">{t("confirmPasswordLabel")}</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 rounded-2xl"
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-destructive font-bold">{t("passwordMismatch")}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary"
              disabled={loading || Boolean(confirm && password !== confirm)}
            >
              {loading ? t("updatingPassword") : t("updatePasswordBtn")}
            </Button>
          </form>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
