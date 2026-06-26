import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function switchTo(lang) {
    if (lang === current) return;
    i18n.changeLanguage(lang);
    localStorage.setItem("kosmeo_lang", lang);
  }

  return (
    <div className="flex items-center gap-0.5 bg-white/80 backdrop-blur-md rounded-full px-1 py-1 shadow-[0_2px_12px_rgba(124,58,237,0.15)] border border-border/30">
      <button
        onClick={() => switchTo("en")}
        className="relative px-2.5 py-1 rounded-full text-[11px] font-black tracking-widest transition-colors focus:outline-none"
      >
        {current === "en" && (
          <motion.div
            layoutId="lang-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary"
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          />
        )}
        <span className={`relative z-10 ${current === "en" ? "text-white" : "text-muted-foreground"}`}>
          EN
        </span>
      </button>

      <span className="text-[10px] text-muted-foreground/50 font-bold select-none">|</span>

      <button
        onClick={() => switchTo("ka")}
        className="relative px-2.5 py-1 rounded-full text-[11px] font-black tracking-widest transition-colors focus:outline-none"
      >
        {current === "ka" && (
          <motion.div
            layoutId="lang-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary"
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          />
        )}
        <span className={`relative z-10 ${current === "ka" ? "text-white" : "text-muted-foreground"}`}>
          ქარ
        </span>
      </button>
    </div>
  );
}
