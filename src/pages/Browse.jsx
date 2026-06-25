import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListingCard from "@/components/ListingCard";
import { MOCK_LISTINGS } from "@/data/mockData";

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
    <div className="flex h-full flex-col bg-background">
      {/* Header Sticky */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pb-4 pt-12 px-4 rounded-b-3xl" style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.05)" }}>
        <h1 className="text-3xl font-black mb-5 text-foreground">Discover</h1>
        
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input 
              placeholder="Search by fandom, character..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-white card-shadow border-none h-14 rounded-2xl text-base font-medium placeholder:text-muted-foreground/70"
              data-testid="input-browse-search"
            />
          </div>
          <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl shrink-0 bg-white card-shadow border-none text-primary" data-testid="btn-filters">
            <SlidersHorizontal className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
          {filters.map(f => (
            <Badge 
              key={f} 
              variant={activeFilter === f ? "default" : "outline"}
              className={`cursor-pointer px-5 py-2.5 text-sm font-bold whitespace-nowrap rounded-full transition-all ${activeFilter === f ? 'bg-primary text-white shadow-md border-none' : 'bg-white card-shadow border-none text-foreground hover:bg-muted'}`}
              onClick={() => setActiveFilter(f)}
              data-testid={`filter-${f.replace(" ", "-")}`}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-4 pt-6">
        <p className="text-sm text-muted-foreground mb-4 font-bold px-1">
          {filteredListings.length} {filteredListings.length === 1 ? 'result' : 'results'}
        </p>
        <div className="grid grid-cols-2 gap-4 pb-12">
          {filteredListings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
          {filteredListings.length === 0 && (
            <div className="col-span-2 py-20 text-center text-muted-foreground font-medium">
              No items match your search. Try different keywords!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
