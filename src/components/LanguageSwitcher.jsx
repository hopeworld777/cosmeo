import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const SPRING = { type: "spring", damping: 22, stiffness: 300 };
const COLOR_ACTIVE   = "#ffffff";
const COLOR_INACTIVE = "hsl(260, 14%, 52%)";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;
  const isKa = current === "ka";

  function switchTo(lang) {
    if (lang === current) return;
    i18n.changeLanguage(lang);
    localStorage.setItem("kosmeo_lang", lang);
  }

  return (
    <div className="relative flex items-center bg-white/80 backdrop-blur-md rounded-full p-[3px] shadow-[0_1px_8px_rgba(124,58,237,0.12)] border border-border/30 shrink-0">
      <motion.div
        className="absolute inset-y-[3px] rounded-full bg-gradient-to-r from-primary to-secondary pointer-events-none z-0"
        animate={
          isKa
            ? { left: "calc(50% + 1.5px)", right: "3px" }
            : { left: "3px", right: "calc(50% + 1.5px)" }
        }
        transition={SPRING}
      />

      <button
        onClick={() => switchTo("en")}
        className="relative z-10 h-[28px] min-w-[30px] px-2 rounded-full text-[12px] font-medium focus:outline-none flex items-center justify-center"
        data-testid="lang-btn-en"
      >
        <motion.span
          className="leading-none select-none"
          animate={{ color: isKa ? COLOR_INACTIVE : COLOR_ACTIVE }}
          transition={SPRING}
        >
          EN
        </motion.span>
      </button>

      <button
        onClick={() => switchTo("ka")}
        className="relative z-10 h-[28px] min-w-[34px] px-2 rounded-full text-[12px] font-medium focus:outline-none flex items-center justify-center"
        data-testid="lang-btn-ka"
      >
        <motion.span
          className="leading-none select-none"
          animate={{ color: isKa ? COLOR_ACTIVE : COLOR_INACTIVE }}
          transition={SPRING}
        >
          ქარ
        </motion.span>
      </button>
    </div>
  );
}
