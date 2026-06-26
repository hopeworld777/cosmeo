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
    <div className="flex items-center bg-white/80 backdrop-blur-md rounded-full p-[3px] shadow-[0_1px_8px_rgba(124,58,237,0.12)] border border-border/30 shrink-0">
      <button
        onClick={() => switchTo("en")}
        className="relative h-[28px] min-w-[30px] px-2 rounded-full text-[12px] font-medium transition-colors focus:outline-none flex items-center justify-center"
      >
        {current === "en" && (
          <motion.div
            layoutId="lang-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary"
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          />
        )}
        <span className={`relative z-10 leading-none ${current === "en" ? "text-white" : "text-muted-foreground"}`}>
          EN
        </span>
      </button>

      <button
        onClick={() => switchTo("ka")}
        className="relative h-[28px] min-w-[34px] px-2 rounded-full text-[12px] font-medium transition-colors focus:outline-none flex items-center justify-center"
      >
        {current === "ka" && (
          <motion.div
            layoutId="lang-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary"
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          />
        )}
        <span className={`relative z-10 leading-none ${current === "ka" ? "text-white" : "text-muted-foreground"}`}>
          ქარ
        </span>
      </button>
    </div>
  );
}
