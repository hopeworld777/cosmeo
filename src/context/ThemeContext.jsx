import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "kosmeo_theme";
const ThemeContext = createContext(null);

// Default theme is "dark" — matches the Dark Cosmos brand aesthetic shown
// on the waitlist landing page. The inline script in index.html applies the
// class before first paint so there's no flash of the wrong theme; this
// just keeps React state in sync with whatever ended up on <html>.
function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return document.documentElement.classList.contains("dark") ? "dark" : "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
