import { createContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const { user: u, token } = await api.auth.register({ username, email, password });
    localStorage.setItem("kosmeo_token", token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("kosmeo_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
