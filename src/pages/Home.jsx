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
    activeClass: "bg-primary text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)]",
    desktopActiveClass: "bg-primary text-white shadow-md shadow-primary/20",
    iconBg: "bg-violet-50 text-violet-600",
  },
  {
    id: "rent",
    icon: CalendarDays,
    tKey: "typeRent",
    activeClass: "bg-sky-500 text-white shadow-[0_4px_14px_rgba(14,165,233,0.3)]",
    desktopActiveClass: "bg-sky-500 text-white shadow-md shadow-sky-500/20",
    iconBg: "bg-sky-50 text-sky-600",
  },
  {
    id: "commission",
    icon: Paintbrush,
    tKey: "typeCommission",
    activeClass: "bg-amber-500 text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)]",
    desktopActiveClass: "bg-amber-500 text-white shadow-md shadow-amber-500/20",
    iconBg: "bg-amber-50 text-amber-600",
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl overflow-hidden bg-white card-shadow">
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

function CommissionComingSoon({ t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center px-6"
    >
      <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
        <Paintbrush className="h-9 w-9 text-amber-400" />
      </div>
      <h3 className="text-2xl font-black text-foreground mb-2">{t("commissionComingSoonTitle", "Commission Coming Soon")}</h3>
      <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xs mb-6">
        {t("commissionComingSoonDesc", "Commission listings will let you hire skilled creators for custom cosplay, props, and handmade pieces. Stay tuned!")}
      </p>
      <Link href="/sell">
        <button className="h-11 px-7 rounded-2xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">
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
      <div className="sticky top-0 z-40 bg-white/97 backdrop-blur-xl border-b border-border/20">

        {/* Brand row — mobile only */}
        <div className="md:hidden flex items-center justify-between px-5 pt-11 pb-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground leading-none">Cosmeo</h1>
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 tracking-wide">ქოსფლეი + მეორადი</p>
          </div>
          <HeaderControls />
        </div>

        {/* Search bar */}
        <div className="px-5 md:px-8 md:pt-4 pb-3 md:max-w-6xl md:mx-auto">
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

        {/* ── Marketplace type — mobile only ─────────────────────────── */}
        <div className="md:hidden px-5 pb-3">
          <div className="flex gap-2">
            {MARKETPLACE_TYPES.map(type => {
              const active = marketplaceType === type.id;
              return (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleTypeChange(type.id)}
                  data-testid={`type-${type.id}`}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                    active ? type.activeClass : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <type.icon className="h-4 w-4 shrink-0" />
                  <span>{t(type.tKey)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Category pills — mobile only ─────────────────────────────── */}
        <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3.5">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "bg-primary text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)]"
                    : "bg-white text-foreground card-shadow hover:bg-primary/5"
                }`}
                data-testid={`cat-${cat.id}`}
              >
                <cat.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{t(cat.tKey)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop Hero ──────────────────────────────────────────────── */}
      <div className="hidden md:block bg-gradient-to-br from-violet-50 via-purple-50/60 to-fuchsia-50/40 border-b border-border/20">
        <div className="max-w-6xl mx-auto px-8 py-12 flex items-center justify-between gap-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-primary/80 tracking-wide uppercase">Cosmeo</span>
            </div>
            <h1 className="text-5xl font-black text-foreground tracking-tight leading-[1.1] mb-4">
              {t("heroHeadline")}
            </h1>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-lg mb-7">
              {t("heroTagline")}
            </p>
            <div className="flex items-center gap-3">
              <Link href="/sell">
                <button className="h-11 px-7 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                  {t("sellBtn")}
                </button>
              </Link>
              <button
                onClick={scrollToListings}
                className="h-11 px-7 rounded-2xl bg-white border border-border text-sm font-bold text-foreground hover:bg-muted/50 transition-all"
              >
                {t("heroExplore", "Explore listings")}
              </button>
            </div>
          </div>

          {/* Decorative stat bubbles */}
          <div className="hidden lg:flex flex-col gap-3 shrink-0">
            {MARKETPLACE_TYPES.map((mtype) => (
              <button
                key={mtype.id}
                onClick={() => handleTypeChange(mtype.id)}
                className={`flex items-center gap-3 border rounded-2xl px-5 py-3.5 shadow-sm min-w-[200px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md text-left ${
                  marketplaceType === mtype.id
                    ? "bg-white border-primary/30 ring-2 ring-primary/20"
                    : "bg-white/80 border-border/40"
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${mtype.iconBg}`}>
                  <mtype.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-sm text-foreground">{t(mtype.tKey)}</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {mtype.id === "buy"        && t("heroBuySub", "Unique cosplay items")}
                    {mtype.id === "rent"       && t("heroRentSub", "For one-time events")}
                    {mtype.id === "commission" && t("commissionSub", "Custom-made creations")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Desktop filter bar (type + categories) ───────────────────── */}
      <div className="hidden md:block bg-white/80 border-b border-border/20">
        <div className="max-w-6xl mx-auto px-8 py-4">

          {/* Type tabs row */}
          <div className="flex items-center gap-6 mb-3.5">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">
              {t("browseLabel", "Browse")}
            </span>
            <div className="flex gap-2">
              {MARKETPLACE_TYPES.map(type => {
                const active = marketplaceType === type.id;
                return (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleTypeChange(type.id)}
                    data-testid={`desktop-type-${type.id}`}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                      active ? type.desktopActiveClass : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <type.icon className="h-4 w-4 shrink-0" />
                    {t(type.tKey)}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Category chips row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">
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
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                    active
                      ? cat.activeBg
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <cat.icon className="h-3.5 w-3.5 shrink-0" />
                  {t(cat.tKey)}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-5 pb-20 md:px-8 md:pt-8 md:max-w-6xl md:mx-auto md:w-full" ref={listingsRef}>

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
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
  );
}
