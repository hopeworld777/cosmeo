import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

let gsiScriptPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load Google sign-in"));
      document.head.appendChild(script);
    });
  }
  return gsiScriptPromise;
}

/**
 * "Continue with Google" — renders Google's own button via Google
 * Identity Services (GSI). Handles both new-account creation and signing
 * into an existing account: the backend decides which based on whether
 * the Google account (or its email) is already registered.
 *
 * Silently renders nothing if Google sign-in isn't configured
 * (no VITE-exposed client ID from /api/config) so the app keeps working
 * without it.
 */
export default function GoogleAuthButton({ onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const buttonRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => setClientId(cfg.googleClientId || null))
      .catch(() => setClientId(null));
  }, []);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              const u = await loginWithGoogle(credential);
              onSuccess?.(u);
            } catch (err) {
              toast({
                title: "Google sign-in failed",
                description: err.message || "Please try again.",
                variant: "destructive",
              });
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text: "continue_with",
        });
        setReady(true);
      })
      .catch(() => setReady(false));

    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="w-full flex flex-col items-center">
      <div ref={buttonRef} className="w-full flex justify-center [&>div]:!w-full" />
      {!ready && (
        <div className="h-11 w-full rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      )}
    </div>
  );
}
