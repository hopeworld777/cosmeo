import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag, Heart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const SLIDE_CONFIG = [
  {
    icon: Sparkles,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    gradient: "from-violet-100 via-purple-50 to-fuchsia-50",
    accent: "#7c3aed",
    titleKey: "slide1Title",
    descKey: "slide1Desc",
  },
  {
    icon: ShoppingBag,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-100",
    gradient: "from-pink-100 via-rose-50 to-orange-50",
    accent: "#ec4899",
    titleKey: "slide2Title",
    descKey: "slide2Desc",
  },
  {
    icon: Heart,
    iconColor: "text-secondary",
    iconBg: "bg-secondary/10",
    gradient: "from-fuchsia-100 via-pink-50 to-purple-50",
    accent: "#a855f7",
    titleKey: "slide3Title",
    descKey: "slide3Desc",
  },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [, setLocation] = useLocation();
  const isLast = page === SLIDE_CONFIG.length - 1;

  function finish() {
    localStorage.setItem("kosmeo_onboarded", "1");
    setLocation("/register");
  }

  function skip() {
    localStorage.setItem("kosmeo_onboarded", "1");
    setLocation("/login");
  }

  const slide = SLIDE_CONFIG[page];
  const Icon = slide.icon;

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br ${slide.gradient} transition-all duration-700`}>

      {/* Top row: Skip (left) + LanguageSwitcher (right) */}
      <div className="flex items-center justify-between px-6 pt-12">
        <button
          onClick={skip}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
        >
          {t("skip")}
        </button>
        <LanguageSwitcher />
      </div>

      {/* Illustration area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center text-center"
          >
            {/* Big icon blob */}
            <div
              className={`w-32 h-32 rounded-[2.5rem] ${slide.iconBg} flex items-center justify-center mb-8 shadow-xl`}
              style={{ boxShadow: `0 16px 48px ${slide.accent}22` }}
            >
              <Icon className={`h-16 w-16 ${slide.iconColor}`} strokeWidth={1.5} />
            </div>

            {/* Decorative blob */}
            <div
              className="absolute -z-10 w-64 h-64 rounded-full opacity-20 blur-3xl"
              style={{ background: slide.accent }}
            />

            <h1 className="text-3xl font-black text-foreground mb-3 leading-tight">
              {t(slide.titleKey)}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t(slide.descKey)}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-12 space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDE_CONFIG.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === page ? 28 : 8, opacity: i === page ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full cursor-pointer"
              style={{ background: slide.accent }}
              onClick={() => setPage(i)}
            />
          ))}
        </div>

        {/* CTA */}
        {isLast ? (
          <div className="space-y-3">
            <Button
              onClick={finish}
              className="w-full h-14 rounded-2xl text-base font-black text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${slide.accent}, #a855f7)` }}
            >
              {t("getStarted")}
            </Button>
            <button
              onClick={skip}
              className="w-full h-10 text-sm font-semibold text-muted-foreground"
            >
              {t("alreadyHaveAccount")}
            </button>
          </div>
        ) : (
          <Button
            onClick={() => setPage(p => p + 1)}
            className="w-full h-14 rounded-2xl text-base font-black text-white shadow-lg flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${slide.accent}, #a855f7)` }}
          >
            {t("next")}
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
