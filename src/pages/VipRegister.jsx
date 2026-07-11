import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function VipRegister() {
  const [, setLocation] = useLocation();
  const { setUser, setToken } = useAuth();

  const [form, setForm] = useState({ vipCode: "", username: "", email: "", password: "", bio: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/vip-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "email_taken")    return setError("That email is already registered.");
        if (data.error === "username_taken") return setError("That username is taken.");
        if (data.error === "Invalid VIP code.") return setError("Wrong VIP code — check with the team.");
        return setError(data.error || "Something went wrong.");
      }
      // Store auth and redirect straight into the app
      setToken(data.token);
      setUser(data.user);
      setLocation("/onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-foreground tracking-tight">cosmeo</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Early access — testers only</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* VIP code */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              VIP Code
            </label>
            <input
              name="vipCode"
              type="password"
              value={form.vipCode}
              onChange={handleChange}
              placeholder="Enter your VIP code"
              required
              autoComplete="off"
              className="h-12 rounded-2xl px-4 bg-muted text-foreground text-sm font-medium placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          <hr className="border-border/40" />

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Username
            </label>
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="your_username"
              required
              autoComplete="username"
              className="h-12 rounded-2xl px-4 bg-muted text-foreground text-sm font-medium placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-12 rounded-2xl px-4 bg-muted text-foreground text-sm font-medium placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Password
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
              className="h-12 rounded-2xl px-4 bg-muted text-foreground text-sm font-medium placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm font-semibold text-destructive text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-2xl bg-primary text-white text-sm font-black transition-all hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] mt-1"
          >
            {loading ? "Creating account…" : "Create my account"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
