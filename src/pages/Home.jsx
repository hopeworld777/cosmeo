import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, Zap, Flame, Shirt, Wand2, Scissors, Shield, Gem } from "lucide-react";
import { Link } from "wouter";
import ListingCard from "@/components/ListingCard";
import { CATEGORIES } from "@/data/mockData";
import { api } from "@/lib/api";

const iconMap = {
  Shirt,
  Wand: Wand2,
  Wand2,
  Scissors,
  Shield,
  Gem,
};

export default function Home() {
  const [trendingListings, setTrendingListings] = useState([]);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [trending, recent] = await Promise.all([
          api.listings.trending(),
          api.listings.list({ limit: 6, offset: 4 })
        ]);
        setTrendingListings(trending || []);
        setRecentListings(recent || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="flex flex-col pb-6 bg-background">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-10 pastel-gradient rounded-b-[2.5rem]">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-black tracking-tight text-foreground">Kosmeo</h1>
          </div>
          <p className="text-muted-foreground mb-8 text-lg font-medium">Where cosplay culture shops.</p>
          
          <Link href="/browse">
            <div className="relative group cursor-pointer" data-testid="search-bar">
              <div className="relative flex items-center h-14 w-full rounded-2xl bg-white px-4 card-shadow border border-border/50">
                <Search className="h-5 w-5 text-primary mr-3" />
                <span className="text-muted-foreground font-medium">Search props, wigs, costumes...</span>
              </div>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="px-4 py-8">
        <h2 className="text-xl font-extrabold mb-5 flex items-center gap-2 text-foreground">
          <Zap className="h-5 w-5 text-primary" />
          Explore
        </h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x">
          {CATEGORIES.map((cat, i) => {
            const Icon = iconMap[cat.icon] || Shirt;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="snap-start shrink-0 flex flex-col items-center justify-center gap-3"
              >
                <Link href={`/browse?category=${cat.id}`}>
                  <div className="h-20 w-20 rounded-full bg-white card-shadow flex items-center justify-center hover:-translate-y-1 transition-transform cursor-pointer border border-border/50">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                </Link>
                <span className="text-sm text-foreground font-bold">{cat.name}</span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trending */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-extrabold flex items-center gap-2 text-foreground">
            <Flame className="h-6 w-6 text-secondary" />
            Trending Now
          </h2>
          <Link href="/browse"><span className="text-sm font-bold text-primary cursor-pointer hover:opacity-80">View all</span></Link>
        </div>
        
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 snap-x">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[240px] shrink-0 snap-start">
                <div className="aspect-[3/4] w-full bg-muted rounded-3xl animate-pulse" />
              </div>
            ))
          ) : trendingListings.length === 0 ? (
             <div className="text-muted-foreground font-medium py-4">No trending listings yet.</div>
          ) : (
            trendingListings.map((listing, i) => (
              <div key={listing.id} className="w-[240px] shrink-0 snap-start">
                <ListingCard listing={listing} index={i} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Just Dropped */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-extrabold mb-5 text-foreground">Just Dropped</h2>
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full bg-muted rounded-3xl animate-pulse" />
            ))
          ) : recentListings.length === 0 ? (
             <div className="col-span-2 text-muted-foreground font-medium py-4">No recent listings yet.</div>
          ) : (
            recentListings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
