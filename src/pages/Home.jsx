import { motion } from "framer-motion";
import { Search, Sparkles, Zap, Flame } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import ListingCard from "@/components/ListingCard";
import { MOCK_LISTINGS, CATEGORIES } from "@/data/mockData";

export default function Home() {
  const trendingListings = MOCK_LISTINGS.slice(0, 4);
  const recentListings = MOCK_LISTINGS.slice(4, 10);

  return (
    <div className="flex flex-col pb-6">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8 bg-grid-pattern">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h1 className="text-3xl font-bold tracking-tight text-white">Kosmeo</h1>
          </div>
          <p className="text-muted-foreground mb-6 text-lg">Where cosplay culture shops.</p>
          
          <Link href="/browse">
            <div className="relative group cursor-pointer" data-testid="search-bar">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary blur-sm opacity-50 group-hover:opacity-100 transition duration-500" />
              <div className="relative flex items-center h-12 w-full rounded-xl bg-card border border-white/10 px-4 shadow-xl">
                <Search className="h-5 w-5 text-muted-foreground mr-3" />
                <span className="text-muted-foreground">Search props, wigs, costumes...</span>
              </div>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="px-4 py-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Explore
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="snap-start shrink-0 flex flex-col items-center justify-center gap-2"
            >
              <Link href={`/browse?category=${cat.id}`}>
                <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer shadow-md">
                  <span className="text-sm font-semibold text-foreground/80">{cat.name.charAt(0)}</span>
                </div>
              </Link>
              <span className="text-xs text-muted-foreground font-medium">{cat.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-secondary" />
            Trending Now
          </h2>
          <Link href="/browse"><span className="text-sm font-medium text-primary cursor-pointer hover:underline">View all</span></Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x">
          {trendingListings.map((listing, i) => (
            <div key={listing.id} className="w-[200px] shrink-0 snap-start">
              <ListingCard listing={listing} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* Just Dropped */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Just Dropped</h2>
        <div className="grid grid-cols-2 gap-4">
          {recentListings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
