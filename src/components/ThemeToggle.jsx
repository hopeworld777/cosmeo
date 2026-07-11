import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";

/**
 * Sleek Sun/Moon toggle — mirrors the 34px control-group sizing used by
 * LanguageSwitcher / avatar buttons in the headers it lives in.
 */
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("switchToLight", "Switch to light mode") : t("switchToDark", "Switch to dark mode")}
      data-testid="button-theme-toggle"
      className={`h-[34px] w-[34px] rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-foreground" />
      ) : (
        <Moon className="h-4 w-4 text-foreground" />
      )}
    </button>
  );
}
