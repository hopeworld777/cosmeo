import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ShieldCheck, Sparkles,
  LayoutGrid, Shirt, Wand2, Footprints, Shield, Scissors, Gem, Archive,
  ShoppingCart, CalendarDays, Paintbrush, ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import ListingCard from "@/components/ListingCard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import HeaderControls from "@/components/HeaderControls";

const CAT_MAP = {
  costume: "outfit", armor: "prop", wig: "wig",
  prop: "prop", accessories: "accessories",
};

const MARKETPLACE_TYPES = [
  {
    id: "buy",
    icon: ShoppingCart,
    tKey: "typeBuy",
    // Soft lavender pastel — deep violet text for contrast
    activeClass: "bg-[#EDE8FF] text-[#3B1F8C] shadow-[0_4px_14px_rgba(59,31,140,0.12)]",
    desktopActiveClass: "bg-[#EDE8FF] text-[#3B1F8C] shadow-sm",
    iconBg: "bg-[#E2DAF8] text-[#3B1F8C]",
  },
  {
    id: "rent",
    icon: CalendarDays,
    tKey: "typeRent",
    // Matcha mint pastel — dark sage text (#2E4F32) for contrast
    activeClass: "bg-[#E8F5E9] text-[#2E4F32] shadow-[0_4px_14px_rgba(46,79,50,0.12)]",
    desktopActiveClass: "bg-[#E8F5E9] text-[#2E4F32] shadow-sm",
    iconBg: "bg-[#D6EDD8] text-[#2E4F32]",
  },
  {
    id: "commission",
    icon: Paintbrush,
    tKey: "typeCommission",
    // Apricot cream pastel — burnt terracotta text (#6E4A3C) for contrast
    activeClass: "bg-[#FFF2E6] text-[#6E4A3C] shadow-[0_4px_14px_rgba(110,74,60,0.12)]",
    desktopActiveClass: "bg-[#FFF2E6] text-[#6E4A3C] shadow-sm",
    iconBg: "bg-[#FFE4CC] text-[#6E4A3C]",
  },
];

const CATEGORIES = [
  { id: "all",          icon: LayoutGrid, tKey: "all",          text: "text-violet-700",   activeBg: "bg-primary/10 text-primary ring-1 ring-primary/30" },
  { id: "outfit",       icon: Shirt,      tKey: "outfits",      text: "text-pink-700",     activeBg: "bg-pink-50 text-pink-700 ring-1 ring-pink-200" },
  { id: "wig",          icon: Wand2,      tKey: "wigs",         text: "text-purple-700",   activeBg: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  { id: "shoes",        icon: Footprints, tKey: "shoes",        text: "text-sky-700",      activeBg: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  { id: "prop",         icon: Shield,     tKey: "props",        text: "text-emerald-700",  activeBg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  { id: "accessories",  icon: Gem,        tKey: "accessories",  text: "text-fuchsia-700",  activeBg: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200" },
  { id: "crafting",     icon: Scissors,   tKey: "materials",    text: "text-orange-700",   activeBg: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
  { id: "collectibles", icon: Archive,    tKey: "collectibles", text: "text-indigo-700",   activeBg: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
];

function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl overflow-hidden bg-card card-shadow">
          <div className="aspect-[3/4] bg-muted animate-pulse" />
          <div className="p-3.5 space-y-2.5">
            <div className="h-3.5 bg-muted rounded-full animate-pulse w-2/5" />
            <div className="h-3 bg-muted rounded-full animate-pulse w-4/5" />
            <div className="h-3 bg-muted rounded-full animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, count, onViewAll, t }) {
  return (
    <div className="flex items-center justify-between mb-5 px-1">
      <h2 className="text-xl font-black text-foreground tracking-tight">{title}</h2>
      {count > 4 && onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/70 transition-colors"
        >
          {t("viewAll")} <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Cosmic hero background ────────────────────────────────────────────
const HERO_STARS = [
  { top: "8%",  left: "5%",   s: 1.5, d: 0.0,  gold: false },
  { top: "18%", left: "12%",  s: 1.0, d: 1.2,  gold: true  },
  { top: "6%",  left: "22%",  s: 2.0, d: 0.4,  gold: false },
  { top: "30%", left: "3%",   s: 1.0, d: 2.1,  gold: false },
  { top: "45%", left: "7%",   s: 1.5, d: 0.7,  gold: true  },
  { top: "60%", left: "4%",   s: 1.0, d: 1.6,  gold: false },
  { top: "75%", left: "14%",  s: 2.0, d: 0.2,  gold: false },
  { top: "85%", left: "6%",   s: 1.5, d: 1.9,  gold: true  },
  { top: "92%", left: "18%",  s: 1.0, d: 0.5,  gold: false },
  { top: "10%", left: "88%",  s: 1.5, d: 0.6,  gold: false },
  { top: "22%", left: "93%",  s: 1.0, d: 1.1,  gold: true  },
  { top: "35%", left: "88%",  s: 2.0, d: 0.9,  gold: false },
  { top: "50%", left: "95%",  s: 1.0, d: 2.3,  gold: false },
  { top: "65%", left: "90%",  s: 1.5, d: 0.6,  gold: true  },
  { top: "80%", left: "86%",  s: 1.0, d: 1.4,  gold: false },
  { top: "90%", left: "92%",  s: 2.0, d: 0.3,  gold: false },
  { top: "15%", left: "45%",  s: 1.0, d: 1.8,  gold: true  },
  { top: "5%",  left: "60%",  s: 1.5, d: 0.1,  gold: false },
  { top: "92%", left: "40%",  s: 1.0, d: 1.5,  gold: false },
  { top: "88%", left: "55%",  s: 1.5, d: 2.0,  gold: true  },
  { top: "70%", left: "75%",  s: 1.0, d: 0.8,  gold: false },
  { top: "40%", left: "78%",  s: 1.5, d: 1.3,  gold: true  },
  { top: "55%", left: "25%",  s: 1.0, d: 0.4,  gold: false },
  { top: "20%", left: "72%",  s: 1.5, d: 2.4,  gold: false },
  { top: "50%", left: "48%",  s: 1.0, d: 1.0,  gold: true  },
];

function CosmicStars() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Glow blobs */}
      <div className="absolute top-[-30%] left-[-8%] w-[500px] h-[500px] rounded-full opacity-0 dark:opacity-25 bg-[radial-gradient(circle,_#4f46e5_0%,_transparent_70%)] blur-3xl transition-opacity duration-500" />
      <div className="absolute bottom-[-30%] right-[-8%] w-[420px] h-[420px] rounded-full opacity-0 dark:opacity-20 bg-[radial-gradient(circle,_#7c3aed_0%,_transparent_70%)] blur-3xl transition-opacity duration-500" />
      {/* Light mode whisper glow */}
      <div className="absolute top-[5%] right-[15%] w-[280px] h-[280px] rounded-full opacity-40 dark:opacity-0 bg-[radial-gradient(circle,_#c4b5fd_0%,_transparent_70%)] blur-2xl transition-opacity duration-500" />
      <div className="absolute bottom-[5%] left-[20%] w-[200px] h-[200px] rounded-full opacity-30 dark:opacity-0 bg-[radial-gradient(circle,_#ddd6fe_0%,_transparent_70%)] blur-2xl transition-opacity duration-500" />
      {/* Stars */}
      {HERO_STARS.map((star, i) => (
        <div
          key={i}
          className={`hero-star ${star.gold ? "hero-star-gold" : "hero-star-silver"}`}
          style={{
            top: star.top,
            left: star.left,
            width:  star.s * 2 + "px",
            height: star.s * 2 + "px",
            animationDelay: star.d + "s",
          }}
        />
      ))}
    </div>
  );
}

function CommissionComingSoon({ t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center px-6"
    >
      <div className="h-20 w-20 rounded-full bg-[#FFF2E6] flex items-center justify-center mb-5">
        <Paintbrush className="h-9 w-9 text-[#6E4A3C]" />
      </div>
      <h3 className="text-2xl font-black text-foreground mb-2">{t("commissionComingSoonTitle", "Commission Coming Soon")}</h3>
      <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xs mb-6">
        {t("commissionComingSoonDesc", "Commission listings will let you hire skilled creators for custom cosplay, props, and handmade pieces. Stay tuned!")}
      </p>
      <Link href="/sell">
        <button className="h-11 px-7 rounded-2xl bg-[#FFF2E6] text-[#6E4A3C] text-sm font-bold hover:bg-[#FFE4CC] transition-all shadow-md shadow-[rgba(110,74,60,0.12)]">
          {t("sellBtn")}
        </button>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [marketplaceType, setMarketplaceType] = useState("buy");
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [apiItems, setApiItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const listingsRef = useRef(null);
  const [safetyCardClosed, setSafetyCardClosed] = useState(
    () => localStorage.getItem("kosmeo_safety_card_v1") === "1"
  );

  function dismissSafetyCard() {
    localStorage.setItem("kosmeo_safety_card_v1", "1");
    setSafetyCardClosed(true);
  }

  const fetchListings = () => {
    setLoading(true);
    api.listings.list({ limit: 80 })
      .then(data => {
        const normalised = (data || []).map(l => ({
          ...l,
          category: CAT_MAP[l.category] || l.category,
          location: l.seller_location || l.location || "",
        }));
        setApiItems(normalised);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListings();
    window.addEventListener("kosmeo:listingChanged", fetchListings);
    return () => window.removeEventListener("kosmeo:listingChanged", fetchListings);
  }, []);

  const typeFiltered = useMemo(() => {
    if (marketplaceType === "commission") return [];
    return apiItems.filter(i =>
      marketplaceType === "buy" ? i.is_for_sale : i.is_for_rent
    );
  }, [marketplaceType, apiItems]);

  const filtered = useMemo(() => {
    if (marketplaceType === "commission") return [];
    return typeFiltered.filter(item => {
      const catMatch = activeCategory === "all" || item.category === activeCategory;
      const q = query.trim().toLowerCase();
      const textMatch = !q || [item.title, item.fandom, item.location, item.seller_username]
        .some(f => (f || "").toLowerCase().includes(q));
      return catMatch && textMatch;
    });
  }, [typeFiltered, activeCategory, query, marketplaceType]);

  const showEditorial = marketplaceType === "buy" && activeCategory === "all" && !query.trim();

  const featuredListings = useMemo(() =>
    typeFiltered.filter(i => i.images?.length > 0).slice(0, 8),
    [typeFiltered]
  );
  const spotlightListings = useMemo(() =>
    apiItems.filter(i => i.is_featured && i.images?.length > 0),
    [apiItems]
  );
  const newArrivals = useMemo(() => typeFiltered.slice(0, 8), [typeFiltered]);

  const scrollToListings = () =>
    listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    scrollToListings();
  };

  const handleTypeChange = (typeId) => {
    setMarketplaceType(typeId);
    setActiveCategory("all");
    setQuery("");
  };

  const activeType = MARKETPLACE_TYPES.find(t => t.id === marketplaceType);
  const activeCat  = CATEGORIES.find(c => c.id === activeCategory);
  const isFiltered = query.trim() !== "" || activeCategory !== "all";

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-card/97 backdrop-blur-xl border-b border-border/20">

        {/* Brand row — mobile only */}
        <div className="md:hidden flex items-center justify-between px-5 pt-11 pb-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-10 w-10 object-contain shrink-0" />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground leading-none">cosmeo</h1>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 tracking-wide">ქოსფლეი + მეორადი</p>
            </div>
          </div>
          <HeaderControls />
        </div>

        {/* Search bar — mobile only (desktop search lives in the centered hero below) */}
        <div className="md:hidden px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
            <input
              type="text"
              placeholder={t("searchBrowsePlaceholder")}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-13 pl-12 pr-10 py-3.5 rounded-2xl bg-muted text-base font-medium placeholder:text-muted-foreground/60 border-none outline-none focus:ring-2 focus:ring-primary/25 transition-shadow"
              data-testid="input-home-search"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ── Centered hero + search (desktop) ─────────────────────────── */}
      <div className="hidden md:block relative overflow-hidden border-b border-border/20 bg-gradient-to-br from-[#faf5ff] via-[#f0e6ff] to-[#e9e3fa] dark:from-[#060b1e] dark:via-[#100528] dark:to-[#060f24]">
        <CosmicStars />
        <div className="relative z-10 px-8 py-14">
          <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-8 w-full">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain shrink-0" />
              <span className="text-sm font-bold text-primary/80 tracking-wide uppercase">cosmeo</span>
            </div>
            <h1 className="text-5xl font-black text-foreground tracking-tight leading-[1.1] mb-4">
              {t("heroHeadline")}
            </h1>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-lg mb-7">
              {t("heroTagline")}
            </p>
            <div className="flex items-center gap-3 mb-8">
              <Link href="/sell">
                <button className="h-11 px-7 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                  {t("sellBtn")}
                </button>
              </Link>
              <button
                onClick={scrollToListings}
                className="h-11 px-7 rounded-2xl bg-card border border-border text-sm font-bold text-foreground hover:bg-muted/50 transition-all"
              >
                {t("heroExplore", "Explore listings")}
              </button>
            </div>

            {/* Search bar */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
              <input
                type="text"
                placeholder={t("searchBrowsePlaceholder")}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-10 py-3.5 rounded-2xl text-base font-medium outline-none transition-shadow bg-white border border-border/60 shadow-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/25 dark:bg-slate-700/60 dark:backdrop-blur dark:border-slate-600/40 dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-primary/30"
                data-testid="input-home-search-desktop"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    onClick={() => setQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content: sidebar + feed grid ───────────────────────── */}
      <div
        className="flex-1 px-4 pt-5 pb-20 md:px-8 md:pt-8 md:max-w-[1600px] md:w-full grid grid-cols-1 md:grid-cols-4 gap-6 items-start"
        ref={listingsRef}
      >

        {/* ── Sidebar (desktop: fixed column / mobile: compact bars) ──── */}
        <div className="md:col-span-1 md:sticky md:top-28 flex flex-col gap-3 md:gap-4 -mx-4 px-4 md:mx-0 md:px-0">

          {/* Nav actions — mobile: sleek segmented control / desktop: stacked list */}
          <div className="flex md:hidden items-center gap-1 bg-muted/70 rounded-2xl p-1">
            {MARKETPLACE_TYPES.map(type => {
              const active = marketplaceType === type.id;
              return (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleTypeChange(type.id)}
                  data-testid={`mobile-type-${type.id}`}
                  aria-pressed={active}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active ? type.activeClass : "text-muted-foreground"
                  }`}
                >
                  <type.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t(type.tKey)}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="hidden md:flex md:flex-col gap-2 md:bg-card md:card-shadow md:rounded-2xl md:p-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 pb-1">
              {t("browseLabel", "Browse")}
            </span>
            {MARKETPLACE_TYPES.map(type => {
              const active = marketplaceType === type.id;
              return (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleTypeChange(type.id)}
                  data-testid={`desktop-type-${type.id}`}
                  aria-pressed={active}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold w-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active ? type.desktopActiveClass : "text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <type.icon className="h-4 w-4 shrink-0" />
                  {t(type.tKey)}
                </motion.button>
              );
            })}
          </div>

          {/* Categories — mobile: horizontal-scroll pill bar / desktop: stacked list */}
          <div className="flex overflow-x-auto whitespace-nowrap gap-2 py-2 no-scrollbar md:hidden">
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  data-testid={`mobile-cat-${cat.id}`}
                  aria-pressed={active}
                  className={`px-3 py-1 text-xs font-bold rounded-full border shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 bg-secondary/30 text-muted-foreground active:bg-primary/20"
                  }`}
                >
                  {t(cat.tKey)}
                </motion.button>
              );
            })}
          </div>
          <div className="hidden md:flex md:flex-col gap-2 md:bg-card md:card-shadow md:rounded-2xl md:p-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 pb-1">
              {t("categories")}
            </span>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  data-testid={`desktop-cat-${cat.id}`}
                  aria-pressed={active}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold w-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active
                      ? cat.activeBg
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  }`}
                >
                  <cat.icon className="h-3.5 w-3.5 shrink-0" />
                  {t(cat.tKey)}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Product feed ─────────────────────────────────────────── */}
        <div className="md:col-span-3 min-w-0">

        {/* Safety card */}
        <AnimatePresence>
          {!safetyCardClosed && !user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              className="flex items-start gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl px-4 py-3.5 mb-6"
            >
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-sm text-foreground leading-tight">{t("newToCosmeo")}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{t("newToCosmeoDesc")}</p>
                <button onClick={() => setLocation("/terms")} className="mt-2 text-xs font-bold text-primary hover:underline">
                  {t("openSafetyGuide")} →
                </button>
              </div>
              <button onClick={dismissSafetyCard} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Commission coming soon */}
        {marketplaceType === "commission" && <CommissionComingSoon t={t} />}

        {/* Buy / Rent content */}
        {marketplaceType !== "commission" && (
          <AnimatePresence mode="popLayout">

            {/* ── Editorial sections (buy + all + no search) ─────────── */}
            {showEditorial && (
              <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-10">

                {/* Featured Spotlight carousel — curated by admins */}
                {!loading && spotlightListings.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-5 px-1">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h2 className="text-xl font-black text-foreground tracking-tight">{t("featuredSpotlight", "Featured Spotlight")}</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 snap-x snap-mandatory">
                      {spotlightListings.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="shrink-0 w-[220px] snap-start"
                        >
                          <Link href={`/item/${item.id}`}>
                            <div className="relative rounded-3xl overflow-hidden aspect-[3/4] shadow-[0_10px_30px_rgba(245,158,11,0.25)] ring-2 ring-amber-300/60 cursor-pointer group">
                              <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow">
                                <Sparkles className="h-2.5 w-2.5" /> SPOTLIGHT
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                                <p className="text-white font-bold text-sm leading-snug line-clamp-2">{item.title}</p>
                                {item.price && (
                                  <p className="text-white/90 font-black text-base mt-1">₾{Number(item.price).toFixed(0)}</p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {!loading && typeFiltered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Sparkles className="h-12 w-12 text-primary/25 mb-4" />
                    <p className="text-lg font-bold text-foreground mb-1">{t("noListingsYet")}</p>
                    <p className="text-sm text-muted-foreground mb-6">{t("beFirstToList")}</p>
                    <Link href="/sell">
                      <button className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-md">
                        {t("sellBtn")}
                      </button>
                    </Link>
                  </div>
                )}

                {(loading || featuredListings.length > 0) && (
                  <section>
                    <SectionHeader title={t("featuredListings")} count={featuredListings.length} t={t} />
                    {loading ? <SkeletonGrid count={8} /> : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredListings.map((item, i) => (
                          <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }}>
                            <ListingCard listing={item} index={i} />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {(loading || newArrivals.length > 0) && (
                  <section>
                    <SectionHeader title={t("newArrivals")} count={newArrivals.length} t={t} />
                    {loading ? <SkeletonGrid count={8} /> : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {newArrivals.map((item, i) => (
                          <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }}>
                            <ListingCard listing={item} index={i} />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </motion.div>
            )}

            {/* ── Filtered grid ─────────────────────────────────────── */}
            {!showEditorial && (
              <motion.div key="filtered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Result header */}
                <div className="flex items-center justify-between mb-5 px-1">
                  <div className="flex items-center gap-2">
                    {activeType && (
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${activeType.iconBg}`}>
                        <activeType.icon className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <p className="text-xl font-black text-foreground tracking-tight">
                      {activeCat && activeCategory !== "all"
                        ? t(activeCat.tKey)
                        : t(activeType?.tKey || "typeBuy")}
                    </p>
                    {!loading && (
                      <span className="text-sm font-bold text-muted-foreground ml-1">
                        · {filtered.length} {filtered.length === 1 ? t("item") : t("items")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setQuery(""); setActiveCategory("all"); }}
                    className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {t("clearFilters")}
                  </button>
                </div>

                {loading ? (
                  <SkeletonGrid count={8} />
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/25 mb-4" />
                    <p className="text-lg font-bold text-foreground mb-1">{t("noItemsFound")}</p>
                    <p className="text-sm text-muted-foreground">{t("tryDifferentSearch")}</p>
                    <button
                      onClick={() => { setQuery(""); setActiveCategory("all"); }}
                      className="mt-4 px-5 py-2.5 rounded-2xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
                    >
                      {t("clearFilters")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((item, i) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035, duration: 0.25 }}>
                        <ListingCard listing={item} index={i} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
        </div>
      </div>
    </div>
  );
}
