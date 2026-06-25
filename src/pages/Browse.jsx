import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListingCard from "@/components/ListingCard";
import { MOCK_LISTINGS, CATEGORIES } from "@/data/mockData";

export default function Browse() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Rentals", "For Sale", "Under $50", "Costumes", "Props"];

  const filteredListings = MOCK_LISTINGS.filter(l => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.fandom.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (activeFilter === "Rentals" && !l.isForRent) return false;
    if (activeFilter === "For Sale" && !l.isForSale) return false;
    if (activeFilter === "Under $50" && l.price > 50) return false;
    if (activeFilter === "Costumes" && l.category !== "costume") return false;
    if (activeFilter === "Props" && l.category !== "prop") return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header Sticky */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-12 pb-4 px-4">
        <h1 className="text-2xl font-bold mb-4">Discover</h1>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by fandom, character..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 h-11"
              data-testid="input-browse-search"
            />
          </div>
          <Button size="icon" variant="outline" className="h-11 w-11 shrink-0 bg-card border-border/50" data-testid="btn-filters">
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {filters.map(f => (
            <Badge 
              key={f} 
              variant={activeFilter === f ? "default" : "outline"}
              className={`cursor-pointer px-4 py-1.5 text-sm whitespace-nowrap rounded-full transition-all ${activeFilter === f ? 'bg-primary text-white shadow-[0_0_10px_rgba(180,60,255,0.3)]' : 'bg-card'}`}
              onClick={() => setActiveFilter(f)}
              data-testid={`filter-${f.replace(" ", "-")}`}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-4">
        <p className="text-sm text-muted-foreground mb-4 font-medium">
          {filteredListings.length} {filteredListings.length === 1 ? 'result' : 'results'} found
        </p>
        <div className="grid grid-cols-2 gap-4 pb-12">
          {filteredListings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
          {filteredListings.length === 0 && (
            <div className="col-span-2 py-20 text-center text-muted-foreground">
              No items match your search. Try different keywords!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
