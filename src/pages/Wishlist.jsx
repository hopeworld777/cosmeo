import ListingCard from "@/components/ListingCard";
import { Heart, Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Link } from "wouter";
import HeaderControls from "@/components/HeaderControls";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.favorites.list()
      .then((data) => setWishlist(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = wishlist.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(q) ||
      (item.fandom || "").toLowerCase().includes(q) ||
      (item.seller_username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-4 px-4 rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-foreground">Wishlist</h1>
            <p className="text-sm font-bold text-primary mt-0.5">
              {loading ? "…" : `${wishlist.length} saved item${wishlist.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <HeaderControls />
        </div>

        {/* Search — only shown when there are items */}
        {!loading && wishlist.length > 0 && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter saved items…"
              className="w-full pl-11 pr-10 h-12 rounded-2xl bg-muted text-sm font-medium placeholder:text-muted-foreground/60 border-none outline-none focus:ring-2 focus:ring-primary/25 transition-shadow"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pt-6 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full bg-muted rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center text-center py-16"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-24 w-24 rounded-full bg-secondary/10 flex items-center justify-center mb-6"
            >
              <Heart className="h-10 w-10 text-secondary" />
            </motion.div>
            <h2 className="text-2xl font-black text-foreground mb-2">Nothing saved yet</h2>
            <p className="text-muted-foreground font-medium max-w-[210px] leading-relaxed">
              Tap the ♥ on any listing to save it here for later.
            </p>
            <Link href="/browse">
              <button className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity">
                Browse Listings
              </button>
            </Link>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <span className="text-4xl mb-3">🔍</span>
            <p className="font-bold text-foreground mb-1">No matches</p>
            <p className="text-sm text-muted-foreground">Try a different keyword</p>
            <button
              onClick={() => setSearch("")}
              className="mt-4 px-5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              Clear filter
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={search}
              className="grid grid-cols-2 gap-4"
            >
              {filtered.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <ListingCard listing={{ ...listing, is_favorited: true }} index={i} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
