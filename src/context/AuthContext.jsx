import { createContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export const AuthContext = createContext(null);

const INVITE_CODE_KEY = "cosmeo_invite_code";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Whether the invite-only waitlist gate is currently enforced at all.
  // Defaults to true (fail closed) until /api/config resolves; flip
  // PUBLIC_LAUNCH=true server-side at launch to turn this false for everyone.
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(cfg => setWaitlistEnabled(cfg.waitlistEnabled !== false))
      .catch(() => {}); // keep the safe default (gate enforced) on failure
  }, []);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("kosmeo_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      localStorage.removeItem("kosmeo_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Re-sync user silently whenever the tab regains focus so that actions
  // performed in another tab (e.g. email verification, avatar change) are
  // reflected immediately without a full page reload.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchMe();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchMe]);

  const login = async (email, password) => {
    const { user: u, token } = await api.auth.login({ email, password });
    localStorage.setItem("kosmeo_token", token);
    setUser(u);
    return u;
  };

  const register = async (username, email, password) => {
    const inviteCode = sessionStorage.getItem(INVITE_CODE_KEY) || undefined;
    const { user: u, token } = await api.auth.register({ username, email, password, inviteCode });
    sessionStorage.removeItem(INVITE_CODE_KEY);
    localStorage.setItem("kosmeo_token", token);
    setUser(u);
    return u;
  };

  // Google Identity Services hands us a signed ID token ("credential") —
  // the backend verifies it, finds/links/creates the account, and returns
  // the same { user, token } shape as email login/register.
  const loginWithGoogle = async (credential) => {
    const inviteCode = sessionStorage.getItem(INVITE_CODE_KEY) || undefined;
    const { user: u, token } = await api.auth.google({ credential, inviteCode });
    sessionStorage.removeItem(INVITE_CODE_KEY);
    localStorage.setItem("kosmeo_token", token);
    setUser(u);
    return u;
  };

  // Hidden admin gate's "Continue with Google" — same shape as
  // loginWithGoogle, but hits the admin-only backend endpoint, which
  // enforces server-side that only the authorized admin Google account
  // may succeed (any other account gets a 403 the caller surfaces as an
  // error via the shared GoogleAuthButton error handling).
  const loginAdminWithGoogle = async (credential) => {
    const { user: u, token } = await api.auth.adminGoogle({ credential });
    localStorage.setItem("kosmeo_token", token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("kosmeo_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginAdminWithGoogle, logout, setUser, waitlistEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}
