import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useAuthStyles } from "@/lib/authStyles";
import AuthLayout from "@/components/AuthLayout";

export default function VerifyEmail() {
  const { t } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const s = useAuthStyles();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    api.auth.verifyEmail(token)
      .then(({ user, token: jwt }) => {
        localStorage.setItem("kosmeo_token", jwt);
        setUser(user);
        setStatus("success");
        setTimeout(() => setLocation("/"), 2500);
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const configs = {
    loading: {
      title: "Verifying your email…",
      subtitle: "Just a moment.",
      badge: "Email verification",
    },
    success: {
      title: "Email verified",
      subtitle: "Your account is fully set up. Welcome to cosmeo!",
      badge: "All done ✨",
    },
    error: {
      title: "Link not valid",
      subtitle: "This verification link has expired or already been used.",
      badge: "Verification failed",
    },
  };

  const cfg = configs[status];

  return (
    <AuthLayout title={cfg.title} subtitle={cfg.subtitle} badge={cfg.badge}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="flex flex-col items-center gap-4 py-2"
      >
        {status === "loading" && (
          <div
            className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center"
            style={s.iconBoxPurple}
          >
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: s.isDark ? "#d8b4fe" : "#7c3aed" }}
              strokeWidth={1.5}
            />
          </div>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center"
              style={s.iconBoxGreen}
            >
              <CheckCircle2 className="h-8 w-8 text-green-500" strokeWidth={1.5} />
            </motion.div>
            <p className="text-[12px] font-medium text-center" style={s.mutedStyle}>
              Taking you home…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div
              className="h-16 w-16 rounded-[1.25rem] flex items-center justify-center"
              style={s.iconBoxRed}
            >
              <XCircle
                className="h-8 w-8"
                style={{ color: "rgba(239,68,68,0.85)" }}
                strokeWidth={1.5}
              />
            </div>
            <button
              onClick={() => setLocation("/")}
              className={s.submitClass + " w-full mt-2"}
              style={s.submitStyle}
            >
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "ag-shimmer 2.4s ease-in-out infinite",
                }}
              />
              Go to cosmeo
            </button>
          </>
        )}
      </motion.div>
    </AuthLayout>
  );
}
