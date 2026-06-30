import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingCart, Tag, CalendarDays, Palette, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const SLIDE_CONFIG = [
  {
    // Welcome → Pastel Lilac
    icon: Sparkles,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-100",
    gradient: "from-violet-50 via-purple-50 to-fuchsia-50",
    desktopFrom: "#c8b4f5",
    desktopTo: "#ddb8f0",
    accent: "#a98ee0",
    titleKey: "slide1Title",
    descKey: "slide1Desc",
  },
  {
    // Buy → Pastel Pink
    icon: ShoppingCart,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-100",
    gradient: "from-pink-50 via-rose-50 to-fuchsia-50",
    desktopFrom: "#f5b8cc",
    desktopTo: "#f0c0d8",
    accent: "#e07aaa",
    titleKey: "slide2Title",
    descKey: "slide2Desc",
  },
  {
    // Sell → Pastel Sky Blue
    icon: Tag,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-100",
    gradient: "from-sky-50 via-blue-50 to-cyan-50",
    desktopFrom: "#93c8f0",
    desktopTo: "#aed8f8",
    accent: "#5aaee0",
    titleKey: "slide3Title",
    descKey: "slide3Desc",
  },
  {
    // Rent → Pastel Mint
    icon: CalendarDays,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-100",
    gradient: "from-emerald-50 via-teal-50 to-green-50",
    desktopFrom: "#88d8c0",
    desktopTo: "#a0e4cc",
    accent: "#48b898",
    titleKey: "slide4Title",
    descKey: "slide4Desc",
  },
  {
    // Commission → Pastel Peach
    icon: Palette,
    iconColor: "text-orange-300",
    iconBg: "bg-orange-100",
    gradient: "from-orange-50 via-amber-50 to-rose-50",
    desktopFrom: "#f5c49a",
    desktopTo: "#f8d0aa",
    accent: "#e0986a",
    titleKey: "slide5Title",
    descKey: "slide5Desc",
  },
];

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: -dir * 60 }),
};

export default function Onboarding() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [timerKey, setTimerKey] = useState(0);
  const [, setLocation] = useLocation();
  const isLast = page === SLIDE_CONFIG.length - 1;

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setPage((p) => (p + 1) % SLIDE_CONFIG.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [timerKey]);

  function goToSlide(i) {
    if (i === page) return;
    setDirection(i > page ? 1 : -1);
    setPage(i);
    setTimerKey((k) => k + 1);
  }

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
      {/* ── MOBILE layout ── hidden on md+ ── */}
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
              <div className="absolute -z-10 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: slide.accent }} />
              <h1 className="text-3xl font-black text-foreground mb-3 leading-tight">{t(slide.titleKey)}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{t(slide.descKey)}</p>
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
                onClick={() => goToSlide(i)}
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
              <button onClick={skip} className="w-full h-10 text-sm font-semibold text-muted-foreground">
                {t("alreadyHaveAccount")}
              </button>
            </div>
          ) : (
            <Button
              onClick={() => { setDirection(1); setPage((p) => p + 1); setTimerKey((k) => k + 1); }}
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
      <div className="hidden md:grid min-h-[100dvh] w-full" style={{ gridTemplateColumns: "1fr 420px" }}>

        {/* ── LEFT: full-height carousel ── */}
        <div className="relative overflow-hidden flex flex-col">

          {/* Animated gradient background */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`bg-${page}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${slide.desktopFrom} 0%, ${slide.desktopTo} 100%)`,
              }}
            />
          </AnimatePresence>

          {/* Decorative blobs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          {/* Brand wordmark */}
          <div className="relative z-10 px-12 pt-10">
            <span className="text-white font-black text-2xl tracking-tight drop-shadow-sm">Cosmeo</span>
          </div>

          {/* Slide content — centered */}
          <div className="relative z-10 flex-1 flex items-center justify-center px-16 pb-8">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`slide-${page}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col items-center text-center"
              >
                {/* Icon container */}
                <motion.div
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                  className="w-48 h-48 rounded-[3.5rem] flex items-center justify-center mb-12 shadow-2xl"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  <Icon className="h-24 w-24 text-white" strokeWidth={1.2} />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="text-5xl font-black text-white mb-5 leading-tight tracking-tight"
                >
                  {t(slide.titleKey)}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.17 }}
                  className="text-white/80 text-xl leading-relaxed max-w-lg"
                >
                  {t(slide.descKey)}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="relative z-10 flex justify-center items-center gap-2 pb-14">
            {SLIDE_CONFIG.map((_, i) => (
              <motion.button
                key={i}
                animate={{
                  width: i === page ? 32 : 8,
                  opacity: i === page ? 1 : 0.38,
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="h-2 rounded-full bg-white cursor-pointer focus:outline-none"
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: clean CTA panel ── */}
        <div className="relative flex flex-col items-center justify-center bg-white px-10 py-12 border-l border-gray-100">
          {/* Language switcher */}
          <div className="absolute top-8 right-8">
            <LanguageSwitcher />
          </div>

          <div className="w-full max-w-[300px] flex flex-col gap-8">
            {/* Branding block */}
            <div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${slide.desktopFrom}, ${slide.desktopTo})` }}
              >
                <Sparkles className="h-6 w-6 text-white" strokeWidth={1.6} />
              </div>
              <h1 className="text-2xl font-black text-foreground leading-snug">
                {t("slide1Title")}
              </h1>
            </div>

            {/* Slide progress — thin progress bar */}
            <div className="flex gap-1.5">
              {SLIDE_CONFIG.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className="flex-1 h-1 rounded-full transition-all focus:outline-none"
                  style={{
                    background: i === page
                      ? `linear-gradient(90deg, ${slide.desktopFrom}, ${slide.desktopTo})`
                      : "#e5e7eb",
                  }}
                  aria-label={t(s.titleKey)}
                />
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={finish}
                className="w-full h-13 rounded-2xl text-base font-black text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${slide.desktopFrom}, ${slide.desktopTo})` }}
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
          </div>
        </div>
      </div>
    </>
  );
}
