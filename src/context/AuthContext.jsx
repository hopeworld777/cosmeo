import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("kosmeo_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      localStorage.removeItem("kosmeo_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const { user, token } = await api.auth.login({ email, password });
    localStorage.setItem("kosmeo_token", token);
    setUser(user);
    return user;
  };

  const register = async (username, email, password) => {
    const { user, token } = await api.auth.register({ username, email, password });
    localStorage.setItem("kosmeo_token", token);
    setUser(user);
    return user;
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
