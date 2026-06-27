import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import {
  ChevronLeft,
  ShieldCheck,
  Users,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ScrollText,
  Star,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ── Controlled accordion section ──────────────────────────────────────────────
function Section({ icon: Icon, titleKey, children, accent = "primary", open, onToggle }) {
  const { t } = useTranslation();

  const accentMap = {
    primary:   "text-primary border-primary/30 bg-primary/5",
    secondary: "text-secondary border-secondary/30 bg-secondary/5",
    accent:    "text-accent-foreground border-accent/50 bg-accent/20",
    warn:      "text-amber-600 border-amber-300 bg-amber-50",
  };

  return (
    <div className={`rounded-2xl border ${accentMap[accent]} overflow-hidden mb-3`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        <Icon size={18} className="shrink-0 opacity-80" />
        <span className="flex-1 font-bold text-[15px] leading-snug">
          {t(titleKey)}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="opacity-60" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-1 text-[13.5px] leading-relaxed text-foreground/80 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Rule({ n, children }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-extrabold flex items-center justify-center">
        {n}
      </span>
      <p>{children}</p>
    </div>
  );
}

function Tip({ emoji, children }) {
  return (
    <div className="flex items-start gap-2 bg-white/70 rounded-xl px-3 py-2.5 border border-border/60">
      <span className="text-base leading-none mt-0.5">{emoji}</span>
      <p className="text-[13px] leading-snug text-foreground/80">{children}</p>
    </div>
  );
}

function Hub({ city, place }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-border/60 px-3 py-2">
      <MapPin size={13} className="text-primary shrink-0" />
      <div>
        <p className="text-[12px] font-bold text-foreground/90">{city}</p>
        <p className="text-[11.5px] text-muted-foreground">{place}</p>
      </div>
    </div>
  );
}

export default function TermsAndSafety() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const initialTab = new URLSearchParams(search).get("tab") === "terms" ? "terms" : "safety";

  const [tab, setTab] = useState(initialTab);

  const [openSections, setOpenSections] = useState({});

  const toggleSection = useCallback((key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      {/* md:top-16 pushes the sticky header below the fixed DesktopNav on desktop */}
      <div className="sticky top-0 md:top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/")}
          className="h-11 w-11 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-extrabold text-[16px] text-foreground leading-tight">
            {t("tos_pageTitle")}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {t("tos_pageSubtitle")}
          </p>
        </div>
        {/* Always-visible language switcher — hidden on md+ because DesktopNav has one */}
        <div className="md:hidden">
          <LanguageSwitcher />
        </div>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-muted rounded-2xl p-1 gap-1">
          {[
            { key: "safety", icon: ShieldCheck, labelKey: "tos_tab_safety" },
            { key: "terms",  icon: ScrollText,  labelKey: "tos_tab_terms"  },
          ].map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-all ${
                tab === key
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-24 pt-2">
        <AnimatePresence mode="wait">
          {tab === "safety" && (
            <motion.div
              key="safety"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {/* Hero card */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 px-4 py-4 mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck size={18} className="text-primary" />
                  <span className="font-extrabold text-[15px] text-primary">
                    {t("tos_safety_hero_title")}
                  </span>
                </div>
                <p className="text-[13px] text-foreground/75 leading-relaxed">
                  {t("tos_safety_hero_desc")}
                </p>
              </div>

              <Section icon={Users}         titleKey="tos_safety_s1_title" accent="primary"
                open={!!openSections["tos_safety_s1_title"]} onToggle={() => toggleSection("tos_safety_s1_title")}>
                <div className="space-y-2">
                  <Rule n={1}>{t("tos_safety_s1_r1")}</Rule>
                  <Rule n={2}>{t("tos_safety_s1_r2")}</Rule>
                  <Rule n={3}>{t("tos_safety_s1_r3")}</Rule>
                  <Rule n={4}>{t("tos_safety_s1_r4")}</Rule>
                  <Rule n={5}>{t("tos_safety_s1_r5")}</Rule>
                </div>
              </Section>

              <Section icon={MapPin}        titleKey="tos_safety_s2_title" accent="secondary"
                open={!!openSections["tos_safety_s2_title"]} onToggle={() => toggleSection("tos_safety_s2_title")}>
                <div className="space-y-2">
                  <Rule n={1}>{t("tos_safety_s2_r1")}</Rule>
                  <Rule n={2}>{t("tos_safety_s2_r2")}</Rule>
                  <Rule n={3}>{t("tos_safety_s2_r3")}</Rule>
                  <Rule n={4}>{t("tos_safety_s2_r4")}</Rule>
                  <Rule n={5}>{t("tos_safety_s2_r5")}</Rule>
                </div>
              </Section>

              <Section icon={AlertTriangle} titleKey="tos_safety_s3_title" accent="warn"
                open={!!openSections["tos_safety_s3_title"]} onToggle={() => toggleSection("tos_safety_s3_title")}>
                <div className="space-y-2">
                  <Rule n={1}>{t("tos_safety_s3_r1")}</Rule>
                  <Rule n={2}>{t("tos_safety_s3_r2")}</Rule>
                  <Rule n={3}>{t("tos_safety_s3_r3")}</Rule>
                  <Rule n={4}>{t("tos_safety_s3_r4")}</Rule>
                  <Rule n={5}>{t("tos_safety_s3_r5")}</Rule>
                </div>
              </Section>

              <Section icon={Users}         titleKey="tos_safety_s4_title" accent="secondary"
                open={!!openSections["tos_safety_s4_title"]} onToggle={() => toggleSection("tos_safety_s4_title")}>
                <div className="space-y-2">
                  <Rule n={1}>{t("tos_safety_s4_r1")}</Rule>
                  <Rule n={2}>{t("tos_safety_s4_r2")}</Rule>
                  <Rule n={3}>{t("tos_safety_s4_r3")}</Rule>
                  <Rule n={4}>{t("tos_safety_s4_r4")}</Rule>
                  <Rule n={5}>{t("tos_safety_s4_r5")}</Rule>
                </div>
              </Section>

              <div className="mb-3">
                <p className="font-extrabold text-[13px] text-foreground/60 uppercase tracking-wider mb-2 px-1">
                  {t("tos_safety_tips_title")}
                </p>
                <div className="space-y-2">
                  <Tip emoji="📸">{t("tos_safety_tip1")}</Tip>
                  <Tip emoji="💬">{t("tos_safety_tip2")}</Tip>
                  <Tip emoji="🤝">{t("tos_safety_tip3")}</Tip>
                  <Tip emoji="⭐">{t("tos_safety_tip4")}</Tip>
                </div>
              </div>

              <div className="mb-3">
                <p className="font-extrabold text-[13px] text-foreground/60 uppercase tracking-wider mb-2 px-1">
                  {t("tos_safety_hubs_title")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Hub city="თბილისი / Tbilisi"  place={t("tos_hub_tbilisi")} />
                  <Hub city="ბათუმი / Batumi"    place={t("tos_hub_batumi")} />
                  <Hub city="ქუთაისი / Kutaisi"  place={t("tos_hub_kutaisi")} />
                  <Hub city="რუსთავი / Rustavi"  place={t("tos_hub_rustavi")} />
                  <Hub city="ზუგდიდი / Zugdidi"  place={t("tos_hub_zugdidi")} />
                  <Hub city="პოტი / Poti"        place={t("tos_hub_poti")} />
                  <Hub city="გორი / Gori"        place={t("tos_hub_gori")} />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={15} className="text-amber-500" />
                  <p className="font-extrabold text-[13.5px] text-amber-700">
                    {t("tos_safety_trust_title")}
                  </p>
                </div>
                <p className="text-[13px] text-amber-700/80 leading-relaxed">
                  {t("tos_safety_trust_desc")}
                </p>
              </div>
            </motion.div>
          )}

          {tab === "terms" && (
            <motion.div
              key="terms"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-2xl bg-muted border border-border/40 px-4 py-3 mb-4 text-[12px] text-muted-foreground">
                <span className="font-bold text-foreground/70">{t("tos_effectiveLabel")}: </span>
                {t("tos_effectiveDate")}
                <span className="mx-2 opacity-40">·</span>
                <span className="font-bold text-foreground/70">{t("tos_jurisdictionLabel")}: </span>
                {t("tos_jurisdiction")}
              </div>

              <Section icon={ScrollText}    titleKey="tos_t1_title" accent="primary"
                open={!!openSections["tos_t1_title"]} onToggle={() => toggleSection("tos_t1_title")}>
                <p>{t("tos_t1_p1")}</p>
                <p>{t("tos_t1_p2")}</p>
              </Section>

              <Section icon={Users}         titleKey="tos_t2_title" accent="primary"
                open={!!openSections["tos_t2_title"]} onToggle={() => toggleSection("tos_t2_title")}>
                <div className="space-y-2">
                  <Rule n={1}>{t("tos_t2_r1")}</Rule>
                  <Rule n={2}>{t("tos_t2_r2")}</Rule>
                  <Rule n={3}>{t("tos_t2_r3")}</Rule>
                  <Rule n={4}>{t("tos_t2_r4")}</Rule>
                  <Rule n={5}>{t("tos_t2_r5")}</Rule>
                </div>
              </Section>

              <Section icon={MapPin}        titleKey="tos_t3_title" accent="secondary"
                open={!!openSections["tos_t3_title"]} onToggle={() => toggleSection("tos_t3_title")}>
                <p>{t("tos_t3_p1")}</p>
                <div className="space-y-2 mt-2">
                  <Rule n={1}>{t("tos_t3_r1")}</Rule>
                  <Rule n={2}>{t("tos_t3_r2")}</Rule>
                  <Rule n={3}>{t("tos_t3_r3")}</Rule>
                </div>
              </Section>

              <Section icon={ShieldCheck}   titleKey="tos_t4_title" accent="accent"
                open={!!openSections["tos_t4_title"]} onToggle={() => toggleSection("tos_t4_title")}>
                <p>{t("tos_t4_p1")}</p>
                <div className="space-y-2 mt-2">
                  <Rule n={1}>{t("tos_t4_r1")}</Rule>
                  <Rule n={2}>{t("tos_t4_r2")}</Rule>
                  <Rule n={3}>{t("tos_t4_r3")}</Rule>
                  <Rule n={4}>{t("tos_t4_r4")}</Rule>
                  <Rule n={5}>{t("tos_t4_r5")}</Rule>
                </div>
              </Section>

              <Section icon={AlertTriangle} titleKey="tos_t5_title" accent="warn"
                open={!!openSections["tos_t5_title"]} onToggle={() => toggleSection("tos_t5_title")}>
                <p>{t("tos_t5_p1")}</p>
                <div className="space-y-2 mt-2">
                  <Rule n={1}>{t("tos_t5_r1")}</Rule>
                  <Rule n={2}>{t("tos_t5_r2")}</Rule>
                  <Rule n={3}>{t("tos_t5_r3")}</Rule>
                </div>
              </Section>

              <Section icon={Star}          titleKey="tos_t6_title" accent="secondary"
                open={!!openSections["tos_t6_title"]} onToggle={() => toggleSection("tos_t6_title")}>
                <p>{t("tos_t6_p1")}</p>
                <div className="space-y-2 mt-2">
                  <Rule n={1}>{t("tos_t6_r1")}</Rule>
                  <Rule n={2}>{t("tos_t6_r2")}</Rule>
                  <Rule n={3}>{t("tos_t6_r3")}</Rule>
                </div>
              </Section>

              <Section icon={ScrollText}    titleKey="tos_t7_title" accent="primary"
                open={!!openSections["tos_t7_title"]} onToggle={() => toggleSection("tos_t7_title")}>
                <p>{t("tos_t7_p1")}</p>
                <p className="mt-1">{t("tos_t7_p2")}</p>
              </Section>

              <Section icon={ScrollText}    titleKey="tos_t8_title" accent="primary"
                open={!!openSections["tos_t8_title"]} onToggle={() => toggleSection("tos_t8_title")}>
                <p>{t("tos_t8_p1")}</p>
                <div className="space-y-2 mt-2">
                  <Rule n={1}>{t("tos_t8_r1")}</Rule>
                  <Rule n={2}>{t("tos_t8_r2")}</Rule>
                  <Rule n={3}>{t("tos_t8_r3")}</Rule>
                </div>
              </Section>

              <Section icon={AlertTriangle} titleKey="tos_t9_title" accent="warn"
                open={!!openSections["tos_t9_title"]} onToggle={() => toggleSection("tos_t9_title")}>
                <p>{t("tos_t9_p1")}</p>
              </Section>

              <Section icon={ScrollText}    titleKey="tos_t10_title" accent="primary"
                open={!!openSections["tos_t10_title"]} onToggle={() => toggleSection("tos_t10_title")}>
                <p>{t("tos_t10_p1")}</p>
                <p className="mt-1">{t("tos_t10_p2")}</p>
              </Section>

              <div className="mt-4 rounded-2xl border border-border/50 bg-muted/50 px-4 py-3 text-[12.5px] text-muted-foreground text-center">
                {t("tos_contactLine")}{" "}
                <a
                  href="mailto:hello@kosmeo.ge"
                  className="text-primary font-bold underline underline-offset-2"
                >
                  hello@kosmeo.ge
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
