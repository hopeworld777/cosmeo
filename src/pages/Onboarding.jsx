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
    desktopGradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    accent: "#7c3aed",
    titleKey: "slide1Title",
    descKey: "slide1Desc",
  },
  {
    icon: ShoppingBag,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-100",
    gradient: "from-pink-100 via-rose-50 to-orange-50",
    desktopGradient: "from-pink-500 via-rose-500 to-orange-400",
    accent: "#ec4899",
    titleKey: "slide2Title",
    descKey: "slide2Desc",
  },
  {
    icon: Heart,
    iconColor: "text-secondary",
    iconBg: "bg-secondary/10",
    gradient: "from-fuchsia-100 via-pink-50 to-purple-50",
    desktopGradient: "from-fuchsia-600 via-pink-500 to-purple-600",
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
    <>
      {/* ── MOBILE layout (unchanged) ── hidden on md+ ── */}
      <div className={`md:hidden flex flex-col h-full bg-gradient-to-br ${slide.gradient} transition-all duration-700`}>
        <div className="flex items-center justify-between px-6 pt-12">
          <button
            onClick={skip}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            {t("skip")}
          </button>
          <LanguageSwitcher />
        </div>

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
              <div
                className={`w-32 h-32 rounded-[2.5rem] ${slide.iconBg} flex items-center justify-center mb-8 shadow-xl`}
                style={{ boxShadow: `0 16px 48px ${slide.accent}22` }}
              >
                <Icon className={`h-16 w-16 ${slide.iconColor}`} strokeWidth={1.5} />
              </div>
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

        <div className="px-6 pb-12 space-y-6">
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

      {/* ── DESKTOP layout ── hidden below md ── */}
      <div className="hidden md:flex min-h-[100dvh] w-full">

        {/* Left panel — animated gradient + illustration */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`left-${page}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative flex-1 flex flex-col items-center justify-center bg-gradient-to-br ${slide.desktopGradient} overflow-hidden`}
          >
            {/* Background decorative blobs */}
            <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full bg-white/10 blur-3xl" />

            {/* Brand */}
            <div className="absolute top-8 left-10">
              <span className="text-white font-black text-2xl tracking-tight opacity-90">CosMeo</span>
            </div>

            {/* Slide content */}
            <div className="flex flex-col items-center text-center px-16 z-10">
              <motion.div
                key={`icon-${page}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-40 h-40 rounded-[3rem] bg-white/20 backdrop-blur-sm flex items-center justify-center mb-10 shadow-2xl"
              >
                <Icon className="h-20 w-20 text-white" strokeWidth={1.3} />
              </motion.div>

              <motion.h2
                key={`title-${page}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-4xl font-black text-white mb-4 leading-tight"
              >
                {t(slide.titleKey)}
              </motion.h2>

              <motion.p
                key={`desc-${page}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="text-white/80 text-lg leading-relaxed max-w-sm"
              >
                {t(slide.descKey)}
              </motion.p>
            </div>

            {/* Slide dots at bottom of left panel */}
            <div className="absolute bottom-10 flex gap-2">
              {SLIDE_CONFIG.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ width: i === page ? 32 : 8, opacity: i === page ? 1 : 0.4 }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full bg-white cursor-pointer"
                  onClick={() => setPage(i)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right panel — controls */}
        <div className="w-[480px] shrink-0 flex flex-col items-center justify-center bg-white px-14 py-12 relative">
          {/* Top row: language switcher */}
          <div className="absolute top-8 right-8">
            <LanguageSwitcher />
          </div>

          {/* Content */}
          <div className="w-full max-w-sm">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-foreground mb-2">
                {t("slide1Title")}
              </h1>
              <p className="text-muted-foreground text-base">
                {t("slide1Desc")}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={finish}
                className="w-full h-13 rounded-2xl text-base font-black text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${slide.accent}, #a855f7)` }}
              >
                {t("getStarted")}
              </Button>

              <Button
                onClick={skip}
                variant="outline"
                className="w-full h-12 rounded-2xl text-base font-semibold border-2"
              >
                {t("alreadyHaveAccount")}
              </Button>
            </div>

            {/* Step through slides */}
            <div className="mt-10 flex flex-col gap-4">
              {SLIDE_CONFIG.map((s, i) => {
                const SlideIcon = s.icon;
                const isActive = i === page;
                return (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                      isActive
                        ? "bg-primary/8 ring-2 ring-primary/20"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}
                    >
                      <SlideIcon className={`h-5 w-5 ${s.iconColor}`} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {t(s.titleKey)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 line-clamp-1">{t(s.descKey)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skip link at bottom */}
          <button
            onClick={skip}
            className="absolute bottom-8 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("skip")} →
          </button>
        </div>
      </div>
    </>
  );
}
