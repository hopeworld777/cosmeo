import { useTheme } from "@/context/ThemeContext";

/**
 * Returns styling primitives that match the Secret Admin Gate visual language.
 * Use in every auth page so all forms feel consistent.
 */
export function useAuthStyles() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    isDark,

    // ── Labels ──────────────────────────────────────────────────────────────
    labelStyle: { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(109,40,217,0.6)" },
    labelClass: "text-[12px] font-bold tracking-wide uppercase block mb-1.5",

    // ── Inputs ──────────────────────────────────────────────────────────────
    inputStyle: {
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
      color: isDark ? "#ffffff" : "#1e1b4b",
      border: isDark ? "1px solid rgba(192,132,252,0.18)" : "1px solid rgba(192,132,252,0.3)",
      caretColor: "#a855f7",
    },
    inputErrorStyle: {
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
      color: isDark ? "#ffffff" : "#1e1b4b",
      border: isDark ? "1px solid hsl(338 58% 67% / 0.65)" : "1px solid hsl(338 68% 60% / 0.65)",
      boxShadow: isDark ? "0 0 0 3px hsl(338 58% 67% / 0.18)" : "0 0 0 3px hsl(338 68% 60% / 0.14)",
      caretColor: "#a855f7",
    },
    inputClass:
      "w-full rounded-2xl px-4 py-3.5 text-[14px] font-semibold outline-none transition-all " +
      "focus:ring-2 focus:ring-purple-400/30 placeholder:opacity-40",

    // ── Checkbox area ────────────────────────────────────────────────────────
    checkboxBoxStyle: (hasError) => ({
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)",
      border: hasError
        ? isDark
          ? "1px solid hsl(338 58% 67% / 0.6)"
          : "1px solid hsl(338 68% 60% / 0.6)"
        : isDark
        ? "1px solid rgba(192,132,252,0.15)"
        : "1px solid rgba(192,132,252,0.25)",
      boxShadow: hasError
        ? isDark
          ? "0 0 0 3px hsl(338 58% 67% / 0.16)"
          : "0 0 0 3px hsl(338 68% 60% / 0.12)"
        : "none",
      borderRadius: "1rem",
      padding: "0.75rem",
      transition: "border-color 150ms ease, box-shadow 150ms ease",
    }),

    // ── Submit button ────────────────────────────────────────────────────────
    submitStyle: {
      background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
      boxShadow: "0 4px 32px rgba(168,85,247,0.45), 0 0 0 1px rgba(168,85,247,0.2)",
    },
    submitClass:
      "relative w-full overflow-hidden rounded-2xl py-4 text-[14px] font-black text-white " +
      "transition-all disabled:opacity-70 active:scale-[0.98] focus:outline-none " +
      "focus-visible:ring-2 focus-visible:ring-purple-400",

    // ── Outline button (secondary action) ───────────────────────────────────
    outlineStyle: {
      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)",
      border: isDark ? "1px solid rgba(192,132,252,0.2)" : "1px solid rgba(192,132,252,0.35)",
      color: isDark ? "#d8b4fe" : "#7c3aed",
    },
    outlineClass:
      "w-full rounded-2xl py-3.5 text-[14px] font-bold transition-all hover:opacity-80 " +
      "active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",

    // ── Text colours ─────────────────────────────────────────────────────────
    mutedStyle: { color: isDark ? "rgba(255,255,255,0.38)" : "rgba(109,40,217,0.5)" },
    linkStyle: { color: isDark ? "#d8b4fe" : "#7c3aed" },
    // Rose-pink — matches --error CSS variable, friendlier than harsh red
    errorStyle: { color: isDark ? "hsl(338 58% 72%)" : "hsl(338 68% 52%)" },

    // ── Status icon backgrounds ──────────────────────────────────────────────
    iconBoxPurple: {
      background: isDark ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.1)",
      border: isDark ? "1px solid rgba(192,132,252,0.2)" : "1px solid rgba(192,132,252,0.25)",
    },
    iconBoxGreen: {
      background: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.1)",
      border: isDark ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(34,197,94,0.2)",
    },
    iconBoxRed: {
      background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
      border: isDark ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(239,68,68,0.15)",
    },
  };
}
