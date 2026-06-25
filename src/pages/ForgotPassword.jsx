import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
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
      // In dev mode the server returns the reset link directly
      if (result.devResetLink) setDevLink(result.devResetLink);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
          <h2 className="text-2xl font-black text-foreground mb-2">Email sent</h2>
          <p className="text-muted-foreground text-sm font-medium mb-1">
            If an account exists for
          </p>
          <p className="text-primary font-bold text-sm mb-6">{email}</p>
          <p className="text-muted-foreground text-sm mb-8">
            you'll receive a password reset link shortly. Check your spam folder if you don't see it.
          </p>

          {devLink && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs font-bold text-amber-700 mb-2">Dev mode — no SMTP configured</p>
              <a
                href={devLink}
                className="text-xs text-primary font-semibold break-all hover:underline"
              >
                {devLink}
              </a>
            </div>
          )}

          <Link href="/login">
            <Button variant="outline" className="w-full h-12 rounded-2xl font-bold">
              Back to Sign In
            </Button>
          </Link>
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
        <Link href="/login">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-semibold text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-foreground mb-2">Forgot your password?</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Enter your email and we'll send you a link to reset it.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 card-shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="font-bold">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-12 rounded-2xl"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-secondary"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
