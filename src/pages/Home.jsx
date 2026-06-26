import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import ListingCard from "@/components/ListingCard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const CAT_MAP = { costume: "outfit", armor: "outfit", wig: "wig", prop: "prop", accessories: "prop" };

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [apiItems, setApiItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [safetyCardClosed, setSafetyCardClosed] = useState(
    () => localStorage.getItem("kosmeo_safety_card_v1") === "1"
  );

  function dismissSafetyCard() {
    localStorage.setItem("kosmeo_safety_card_v1", "1");
    setSafetyCardClosed(true);
  }

  const CATEGORIES = [
    { id: "all",      emoji: "✨", tKey: "all"       },
    { id: "outfit",   emoji: "👗", tKey: "outfits"   },
    { id: "wig",      emoji: "💇", tKey: "wigs"      },
    { id: "shoes",    emoji: "🥾", tKey: "shoes"     },
    { id: "prop",     emoji: "⚔️",  tKey: "props"     },
    { id: "crafting", emoji: "🧵", tKey: "materials" },
  ];

  useEffect(() => {
    setLoading(true);
    api.listings.list({ limit: 40 })
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
  }, []);

  const filtered = useMemo(() => {
    return apiItems.filter(item => {
      const catMatch = activeCategory === "all" || item.category === activeCategory;
      const q = query.trim().toLowerCase();
      const textMatch = !q || [item.title, item.fandom, item.location, item.seller_username]
        .some(f => (f || "").toLowerCase().includes(q));
      return catMatch && textMatch;
    });
  }, [activeCategory, query, apiItems]);

  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-border/20">
        <div className="px-5 pt-11 md:pt-5 pb-3 md:max-w-6xl md:mx-auto">

          {/* Brand row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground leading-none">
                CosMeo
              </h1>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 tracking-wide">
                ქოსფლეი + მეორადი 💜
              </p>
            </div>

            {/* Right controls — language switcher (mobile only) + avatar/sign-in */}
            <div className="flex items-center gap-3">
              <span className="md:hidden"><LanguageSwitcher /></span>
              {user ? (
                <Link href="/profile">
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md cursor-pointer shrink-0"
                  >
                    <span className="text-white font-black text-base">
                      {user.username?.charAt(0).toUpperCase()}
                    </span>
                  </motion.div>
                </Link>
              ) : (
                <Link href="/login">
                  <button className="min-h-[44px] px-4 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
                    {t("signIn")}
                  </button>
                </Link>
              )}
            </div>
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

        {/* ── Categories label + bubbles ─────────────────────────── */}
        <div className="px-5 md:max-w-6xl md:mx-auto pt-1 pb-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t("categories")}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 md:max-w-6xl md:mx-auto pb-3.5 pt-1">
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
                <span className="text-base leading-none">{cat.emoji}</span>
                <span>{t(cat.tKey)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Results grid ──────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-5 pb-8 md:max-w-6xl md:mx-auto md:w-full">

        {/* Safety card — dismissible, shown to guests and new users */}
        <AnimatePresence>
          {!safetyCardClosed && !user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              className="flex items-start gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl px-4 py-3.5 mb-5"
            >
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-sm text-foreground leading-tight">{t("newToKosmeo")}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{t("newToKosmeoDesc")}</p>
                <button
                  onClick={() => setLocation("/terms")}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  {t("openSafetyGuide")} →
                </button>
              </div>
              <button
                onClick={dismissSafetyCard}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-lg font-black text-foreground tracking-tight">
            {t("freshDrops")} ✨
          </p>
          {!loading && (
            <p className="text-sm font-bold text-muted-foreground">
              <span className="text-foreground">{filtered.length}</span>{" "}
              {filtered.length === 1 ? t("item") : t("items")}
              {activeCategory !== "all" && activeCat && (
                <span className="text-muted-foreground"> · {t(activeCat.tKey)}</span>
              )}
            </p>
          )}
        </div>

        {/* Loading skeleton grid */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white card-shadow">
                <div className="aspect-[3/4] bg-muted animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded-full animate-pulse w-4/5" />
                  <div className="h-3 bg-muted rounded-full animate-pulse w-2/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {!loading && filtered.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              {apiItems.length === 0 ? (
                <>
                  <span className="text-5xl mb-4">🌟</span>
                  <p className="text-lg font-bold text-foreground mb-1">{t("noListingsYet")}</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t("beFirstToList")}
                  </p>
                  <Link href="/sell">
                    <button className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-md">
                      {t("sellSomething")}
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-5xl mb-4">🔍</span>
                  <p className="text-lg font-bold text-foreground mb-1">{t("noItemsFound")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("tryDifferentSearch")}
                  </p>
                  <button
                    onClick={() => { setQuery(""); setActiveCategory("all"); }}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
                  >
                    {t("clearFilters")}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {!loading && filtered.length > 0 && (
            <motion.div
              key={`${activeCategory}-${query}`}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <ListingCard listing={item} index={i} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
