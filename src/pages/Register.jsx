import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, EyeOff, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters", variant: "destructive" });
      return;
    }
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-sm mx-auto text-center"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Mail className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Check your inbox</h2>
          <p className="text-muted-foreground text-sm mb-1 font-medium">We sent a verification link to</p>
          <p className="text-primary font-bold text-sm mb-8">{email}</p>

          <div className="bg-white rounded-3xl p-6 card-shadow space-y-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground font-medium">
                Click the link in the email to verify your account and unlock all features.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground font-medium">
                You can browse and buy right now — verification unlocks selling.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setLocation("/")}
            className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary mb-3"
          >
            Continue to Kosmeo
          </Button>
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full h-10 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {resending ? "Sending..." : "Didn't get it? Resend email"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background px-6 pb-12 pt-16 justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-black text-foreground">Kosmeo</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Join the cosplay marketplace</p>
        </div>

        <div className="bg-white rounded-3xl p-6 card-shadow space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username" className="font-bold">Username</Label>
              <Input
                id="reg-username"
                placeholder="CosplayCrafter"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-12 rounded-2xl"
                data-testid="input-register-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="font-bold">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-12 rounded-2xl"
                data-testid="input-register-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="font-bold">Password</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
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
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary"
              disabled={loading}
              data-testid="btn-register-submit"
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground pt-1">
            By creating an account you agree to our Terms of Service.
          </p>
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login">
            <span className="text-primary font-semibold cursor-pointer hover:underline">Sign in</span>
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
