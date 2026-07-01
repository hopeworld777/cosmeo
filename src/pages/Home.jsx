import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ShieldCheck, Sparkles, LayoutGrid, Shirt, Wand2, Footprints, Shield, Scissors, ShoppingBag, Tag, CalendarDays } from "lucide-react";
import { Link, useLocation } from "wouter";
import ListingCard from "@/components/ListingCard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import HeaderControls from "@/components/HeaderControls";

const CAT_MAP = { costume: "outfit", armor: "outfit", wig: "wig", prop: "prop", accessories: "prop" };

const CATEGORIES = [
  { id: "all",      icon: LayoutGrid, tKey: "all",       bg: "from-violet-50 to-purple-50",   border: "border-violet-200/70", text: "text-violet-700" },
  { id: "outfit",   icon: Shirt,      tKey: "outfits",   bg: "from-pink-50 to-rose-50",       border: "border-pink-200/70",   text: "text-pink-700" },
  { id: "wig",      icon: Wand2,      tKey: "wigs",      bg: "from-purple-50 to-violet-50",   border: "border-purple-200/70", text: "text-purple-700" },
  { id: "shoes",    icon: Footprints, tKey: "shoes",     bg: "from-sky-50 to-blue-50",        border: "border-sky-200/70",    text: "text-sky-700" },
  { id: "prop",     icon: Shield,     tKey: "props",     bg: "from-emerald-50 to-teal-50",    border: "border-emerald-200/70",text: "text-emerald-700" },
  { id: "crafting", icon: Scissors,   tKey: "materials", bg: "from-orange-50 to-amber-50",    border: "border-orange-200/70", text: "text-orange-700" },
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

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [apiItems, setApiItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const listingsRef = useRef(null);
  const heroSearchRef = useRef(null);
  const [safetyCardClosed, setSafetyCardClosed] = useState(
    () => localStorage.getItem("kosmeo_safety_card_v1") === "1"
  );

  function dismissSafetyCard() {
    localStorage.setItem("kosmeo_safety_card_v1", "1");
    setSafetyCardClosed(true);
  }

  const fetchListings = () => {
    setLoading(true);
    api.listings.list({ limit: 60 })
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

  const isFiltered = query.trim() !== "" || activeCategory !== "all";

  const filtered = useMemo(() => {
    return apiItems.filter(item => {
      const catMatch = activeCategory === "all" || item.category === activeCategory;
      const q = query.trim().toLowerCase();
      const textMatch = !q || [item.title, item.fandom, item.location, item.seller_username]
        .some(f => (f || "").toLowerCase().includes(q));
      return catMatch && textMatch;
    });
  }, [activeCategory, query, apiItems]);

  const featuredListings = useMemo(() =>
    apiItems.filter(i => i.images?.length > 0).slice(0, 8),
    [apiItems]
  );
  const newArrivals = useMemo(() => apiItems.slice(0, 8), [apiItems]);
  const popularRentals = useMemo(() =>
    apiItems.filter(i => i.is_for_rent).slice(0, 6),
    [apiItems]
  );

  const scrollToListings = () => {
    listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    scrollToListings();
  };

  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-border/20">
        <div className="px-5 pt-11 md:pt-4 pb-3 md:max-w-6xl md:mx-auto">

          {/* Brand row — mobile only */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground leading-none">Cosmeo</h1>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 tracking-wide">ქოსფლეი + მეორადი</p>
            </div>
            <HeaderControls />
          </div>

          {/* Search bar */}
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

        {/* Category pills — mobile only */}
        <div className="md:hidden px-5 pt-1 pb-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("categories")}</p>
        </div>
        <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3.5 pt-1">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "bg-primary text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)]"
                    : "bg-white text-foreground card-shadow hover:bg-primary/5"
                }`}
                data-testid={`cat-${cat.id}`}
              >
                <cat.icon className="h-4 w-4 shrink-0" />
                <span>{t(cat.tKey)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop Hero ─────────────────────────────────────────────── */}
      <div className="hidden md:block bg-gradient-to-br from-violet-50 via-purple-50/60 to-fuchsia-50/40 border-b border-border/20">
        <div className="max-w-6xl mx-auto px-8 py-14 flex items-center justify-between gap-12">
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
          <div className="hidden lg:flex flex-col gap-4 shrink-0">
            {[
              { icon: ShoppingBag,   label: t("heroBuyLabel", "Buy"),        sub: t("heroBuySub", "Unique cosplay items"),  color: "text-violet-500 bg-violet-50" },
              { icon: Tag,           label: t("heroSellLabel", "Sell"),       sub: t("heroSellSub", "List in minutes"),      color: "text-pink-500 bg-pink-50" },
              { icon: CalendarDays,  label: t("heroRentLabel", "Rent"),       sub: t("heroRentSub", "For one-time events"),  color: "text-sky-500 bg-sky-50" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-white/80 border border-border/40 rounded-2xl px-5 py-3.5 shadow-sm min-w-[220px]">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground font-medium">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Desktop Category Grid ─────────────────────────────────────── */}
      <div className="hidden md:block bg-white/60 border-b border-border/20 py-7">
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">{t("categories")}</p>
          <div className="grid grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`flex flex-col items-center gap-3 px-3 py-5 rounded-3xl border bg-gradient-to-b ${cat.bg} ${cat.border} transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                    active ? "ring-2 ring-primary ring-offset-1 shadow-md -translate-y-0.5" : ""
                  }`}
                  data-testid={`desktop-cat-${cat.id}`}
                >
                  <cat.icon className="h-6 w-6" />
                  <span className={`text-xs font-black text-center leading-tight ${active ? "text-primary" : cat.text}`}>
                    {t(cat.tKey)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-5 pb-12 md:px-8 md:pt-10 md:max-w-6xl md:mx-auto md:w-full" ref={listingsRef}>

        {/* Safety card */}
        <AnimatePresence>
          {!safetyCardClosed && !user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              className="flex items-start gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl px-4 py-3.5 mb-8"
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

        {/* ── Filtered results view ─────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          {isFiltered && (
            <motion.div key="filtered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5 px-1">
                <p className="text-xl font-black text-foreground tracking-tight">
                  {activeCategory !== "all" && activeCat
                    ? t(activeCat.tKey)
                    : t("searchResults", "Results")}
                </p>
                <div className="flex items-center gap-2">
                  {!loading && (
                    <p className="text-sm font-bold text-muted-foreground">
                      <span className="text-foreground">{filtered.length}</span>{" "}
                      {filtered.length === 1 ? t("item") : t("items")}
                    </p>
                  )}
                  <button
                    onClick={() => { setQuery(""); setActiveCategory("all"); }}
                    className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {t("clearFilters")}
                  </button>
                </div>
              </div>

              {loading ? (
                <SkeletonGrid count={8} />
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/25 mb-4" />
                  <p className="text-lg font-bold text-foreground mb-1">{t("noItemsFound")}</p>
                  <p className="text-sm text-muted-foreground">{t("tryDifferentSearch")}</p>
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

          {/* ── Sections view (unfiltered) ───────────────────────────── */}
          {!isFiltered && (
            <motion.div key="sections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-12">

              {/* Empty state */}
              {!loading && apiItems.length === 0 && (
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

              {/* Featured Listings */}
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

              {/* New Arrivals */}
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

              {/* Popular Rentals — only if rentals exist */}
              {!loading && popularRentals.length >= 2 && (
                <section>
                  <SectionHeader title={t("popularRentals")} count={popularRentals.length} t={t} />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {popularRentals.map((item, i) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }}>
                        <ListingCard listing={item} index={i} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
