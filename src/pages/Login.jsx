import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
          <p className="text-muted-foreground text-sm font-medium">{t("signInTitle")}</p>
        </div>

        {/* Desktop heading */}
        <div className="hidden md:block mb-8">
          <h2 className="text-3xl font-black text-foreground mb-2">{t("signInTitle")}</h2>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl p-6 card-shadow md:bg-transparent md:p-0 md:shadow-none md:rounded-none space-y-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="font-bold">{t("email")}</Label>
              <Input
                id="login-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-12 rounded-2xl"
                data-testid="input-login-email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="font-bold">{t("password")}</Label>
                <Link href="/forgot-password">
                  <span className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                    {t("forgotPassword")}
                  </span>
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 rounded-2xl pr-11"
                  data-testid="input-login-password"
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
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary"
              disabled={loading}
              data-testid="btn-login-submit"
            >
              {loading ? t("signingIn") : t("signInBtn")}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          <Link href="/register">
            <span className="text-primary font-semibold cursor-pointer hover:underline">
              {t("dontHaveAccount")}
            </span>
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
