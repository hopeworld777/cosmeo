import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("loading"); // loading | success | error

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

  return (
    <div className="flex flex-col min-h-full bg-background px-6 py-16 justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm mx-auto text-center"
      >
        {status === "loading" && (
          <>
            <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Verifying your email...</h2>
            <p className="text-muted-foreground text-sm">Just a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 rounded-[2rem] bg-green-100 flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <CheckCircle2 className="h-12 w-12 text-green-500" strokeWidth={1.5} />
            </motion.div>
            <h2 className="text-2xl font-black text-foreground mb-2">Email verified</h2>
            <p className="text-muted-foreground text-sm mb-2">Your account is fully set up. Welcome to Kosmeo!</p>
            <p className="text-xs text-muted-foreground">Taking you home...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-24 h-24 rounded-[2rem] bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Link not valid</h2>
            <p className="text-muted-foreground text-sm mb-8">
              This verification link has expired or already been used.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="w-full h-12 rounded-2xl font-bold bg-gradient-to-r from-primary to-secondary"
            >
              Go to Kosmeo
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
