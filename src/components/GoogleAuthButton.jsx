import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAuthStyles } from "@/lib/authStyles";

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

// Official multicolor Google "G" mark (static, per Google branding guidelines).
function GoogleGIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" — same Google Identity Services (GSI) OAuth flow
 * as before (handles both sign-up and sign-in; the backend decides which
 * based on whether the Google account/email already exists), but rendered
 * as a fully custom, Cosmeo-styled button instead of Google's stock widget.
 *
 * How it works: Google's own button is still rendered (it's the only way to
 * get a real, click-verified credential — browsers won't let us dispatch a
 * synthetic click into its cross-origin iframe), but it's stretched
 * invisibly over our custom button so the *real* click always lands on it.
 * The visible button underneath is pure decoration; keyboard focus/hover on
 * the invisible control is mirrored onto it via :focus-within/group classes
 * so it always looks and behaves like a normal button.
 *
 * Silently renders nothing if Google sign-in isn't configured
 * (no VITE-exposed client ID from /api/config) so the app keeps working
 * without it.
 */
export default function GoogleAuthButton({ onSuccess }) {
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const s = useAuthStyles();
  const wrapRef = useRef(null);
  const gsiRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => setClientId(cfg.googleClientId || null))
      .catch(() => setClientId(null));
  }, []);

  const renderGsiButton = useCallback(() => {
    if (!gsiRef.current || !wrapRef.current || !window.google?.accounts?.id) return;
    const width = Math.round(wrapRef.current.getBoundingClientRect().width) || 320;
    gsiRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(gsiRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      width,
      text: "continue_with",
    });
  }, []);

  useEffect(() => {
    if (!clientId) return;
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
        renderGsiButton();
        setReady(true);
      })
      .catch(() => setReady(false));

    return () => { cancelled = true; };
  }, [clientId, renderGsiButton]);

  // Keep the invisible GSI button's hit area in sync with our custom
  // button's width whenever the layout changes (resize, font load, etc.).
  useEffect(() => {
    if (!ready || !wrapRef.current) return;
    const observer = new ResizeObserver(() => renderGsiButton());
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [ready, renderGsiButton]);

  if (!clientId) return null;

  return (
    <div
      ref={wrapRef}
      className="group relative w-full"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Real Google button — fully functional, but visually invisible and
          stretched to cover the entire custom button below. This is the
          element that actually receives the click/keyboard activation. */}
      <div
        ref={gsiRef}
        aria-hidden="true"
        className="absolute inset-0 z-10 overflow-hidden rounded-2xl opacity-0 [&_iframe]:!w-full [&_iframe]:!h-full [&>div]:!w-full [&>div]:!h-full"
      />

      {/* Visible, Cosmeo-styled button. Purely decorative — the accessible,
          operable control is the real Google button stacked on top; focus
          rings/hover states are mirrored here via group-focus-within/hover.
          Kept in normal flow (not absolute) so it sets the container's
          height; the invisible GSI overlay above stretches to match via
          inset-0. A loading skeleton takes its place until GSI is ready. */}
      {ready ? (
        <div
          role="button"
          aria-label={t("continueWithGoogle")}
          tabIndex={-1}
          className={
            "pointer-events-none relative flex w-full items-center justify-center gap-3 rounded-2xl " +
            "py-4 text-[14px] font-bold backdrop-blur-xl transition-all duration-300 " +
            "group-focus-within:ring-2 group-focus-within:ring-purple-400 group-focus-within:ring-offset-0"
          }
          style={{
            background: s.isDark
              ? "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.14) 50%, rgba(96,165,250,0.14) 100%)"
              : "linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(236,72,153,0.08) 50%, rgba(96,165,250,0.08) 100%)",
            border: s.isDark
              ? "1px solid rgba(192,132,252,0.28)"
              : "1px solid rgba(192,132,252,0.35)",
            color: s.isDark ? "#ffffff" : "#1e1b4b",
            boxShadow: hover
              ? "0 6px 28px rgba(168,85,247,0.35), 0 0 0 1px rgba(236,72,153,0.15)"
              : "0 2px 12px rgba(168,85,247,0.12)",
          }}
        >
          <GoogleGIcon className="h-5 w-5 shrink-0" />
          <span>{t("continueWithGoogle")}</span>
        </div>
      ) : (
        <div
          className="h-[52px] w-full animate-pulse rounded-2xl"
          style={{ background: s.isDark ? "rgba(255,255,255,0.06)" : "rgba(109,40,217,0.06)" }}
        />
      )}
    </div>
  );
}
