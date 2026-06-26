import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Link } from "wouter";
import ListingCard from "@/components/ListingCard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",      emoji: "✨", label: "All"          },
  { id: "outfit",   emoji: "👗", label: "Full Outfits" },
  { id: "wig",      emoji: "💇", label: "Wigs"         },
  { id: "shoes",    emoji: "🥾", label: "Shoes"        },
  { id: "prop",     emoji: "⚔️",  label: "Props"        },
  { id: "crafting", emoji: "🧵", label: "Crafting/DIY" },
];

// Map DB category slugs → new category ids
const CAT_MAP = { costume: "outfit", armor: "outfit", wig: "wig", prop: "prop", accessories: "prop" };

// ─── Georgian seed items (shown immediately, no API wait) ─────────────────────
const SEED_ITEMS = [
  {
    id: "g1",
    title: "Sailor Moon Wig – Long Silver",
    category: "wig",
    price: 45, is_for_sale: true, is_for_rent: true, rent_price: 12,
    images: ["https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&q=80"],
    seller_username: "TbilisiCrafter", seller_rating: 4.8, seller_review_count: 23,
    location: "Tbilisi", fandom: "Sailor Moon", size: "One Size",
  },
  {
    id: "g2",
    title: "Genshin Impact – Hu Tao Full Costume",
    category: "outfit",
    price: 120, is_for_sale: true, is_for_rent: true, rent_price: 25,
    images: ["https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80"],
    seller_username: "KutaisiCos", seller_rating: 4.9, seller_review_count: 41,
    location: "Kutaisi", fandom: "Genshin Impact", size: "S/M",
  },
  {
    id: "g3",
    title: "EVA Foam Sheets Pack – 5mm, A3 × 10",
    category: "crafting",
    price: 15, is_for_sale: true, is_for_rent: false, rent_price: null,
    images: ["https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80"],
    seller_username: "BatumiProps", seller_rating: 4.7, seller_review_count: 18,
    location: "Batumi", fandom: "DIY / Crafting", size: "A3",
  },
  {
    id: "g4",
    title: "Naruto Shippuden – Orange Jumpsuit Set",
    category: "outfit",
    price: 85, is_for_sale: true, is_for_rent: true, rent_price: 20,
    images: ["https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&q=80"],
    seller_username: "RustaviNinja", seller_rating: 4.6, seller_review_count: 29,
    location: "Rustavi", fandom: "Naruto", size: "M",
  },
  {
    id: "g5",
    title: "Platform Anime Boots – Black, EU 38",
    category: "shoes",
    price: 60, is_for_sale: true, is_for_rent: false, rent_price: null,
    images: ["https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80"],
    seller_username: "TbilisiCrafter", seller_rating: 4.8, seller_review_count: 23,
    location: "Tbilisi", fandom: "General", size: "EU 38",
  },
];

export default function Home() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [apiItems, setApiItems] = useState([]);

  // Fetch real listings from the API in background
  useEffect(() => {
    api.listings.list({ limit: 20 })
      .then(data => {
        // Normalise API items to the new category + location shape
        const normalised = (data || []).map(l => ({
          ...l,
          category: CAT_MAP[l.category] || l.category,
          location: l.seller_location || l.location || "",
        }));
        setApiItems(normalised);
      })
      .catch(() => {});
  }, []);

  // Merge seed + API, deduplicate by id, then filter
  const filtered = useMemo(() => {
    const apiIds = new Set(apiItems.map(i => String(i.id)));
    // Seed items appear first; API items fill in behind them (no duplication)
    const all = [
      ...SEED_ITEMS,
      ...apiItems.filter(i => !SEED_ITEMS.some(s => s.id === String(i.id))),
    ];

    return all.filter(item => {
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
        <div className="px-5 pt-11 pb-3">

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
            {user ? (
              <Link href="/profile">
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md cursor-pointer"
                >
                  <span className="text-white font-black text-base">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </motion.div>
              </Link>
            ) : (
              <Link href="/login">
                <button className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
                  Sign in
                </button>
              </Link>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
            <input
              type="text"
              placeholder="ძიება… costumes, wigs, props"
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

        {/* ── Category bubbles ─────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3.5 pt-1">
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
                <span>{cat.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Results grid ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-5 pb-8">
        {/* Count line */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm font-bold text-muted-foreground">
            <span className="text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "item" : "items"}
            {activeCategory !== "all" && (
              <span className="text-muted-foreground"> in {activeCat?.label}</span>
            )}
            {query && (
              <span className="text-muted-foreground"> for "{query}"</span>
            )}
          </p>
        </div>

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-lg font-bold text-foreground mb-1">No items found</p>
              <p className="text-sm text-muted-foreground">
                Try a different category or search term
              </p>
              <button
                onClick={() => { setQuery(""); setActiveCategory("all"); }}
                className="mt-5 px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
              >
                Clear filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`${activeCategory}-${query}`}
              className="grid grid-cols-2 gap-4"
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
