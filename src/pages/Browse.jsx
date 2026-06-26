import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListingCard from "@/components/ListingCard";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function Browse() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");

  // Filters defined inside component so t() is available
  const FILTERS = [
    { id: "all",      label: t("all")      },
    { id: "rentals",  label: t("rentals")  },
    { id: "sale",     label: t("forSale")  },
    { id: "under50",  label: t("under50")  },
    { id: "costumes", label: t("costumes") },
    { id: "props",    label: t("props")    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const params = { search: debouncedSearch };
        if (activeFilter === "rentals")  params.filter = "rentals";
        if (activeFilter === "sale")     params.filter = "sale";
        if (activeFilter === "under50")  params.filter = "under50";
        if (activeFilter === "costumes") params.category = "costume";
        if (activeFilter === "props")    params.category = "prop";
        const data = await api.listings.list(params);
        setListings(data || []);
      } catch (err) {
        console.error("Failed to fetch listings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [debouncedSearch, activeFilter, initialCategory]);

  return (
    <div className="flex h-full flex-col bg-background">

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pb-4 pt-12 px-4 rounded-b-3xl" style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.05)" }}>
        <h1 className="text-3xl font-black mb-5 text-foreground">{t("discover")}</h1>

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

        {/* ── Filter chips ─────────────────────────────────────────── */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
          {FILTERS.map(f => (
            <Badge
              key={f.id}
              variant={activeFilter === f.id ? "default" : "outline"}
              className={`cursor-pointer px-5 py-2.5 text-sm font-bold whitespace-nowrap rounded-full transition-all ${
                activeFilter === f.id
                  ? "bg-primary text-white shadow-md border-none"
                  : "bg-white card-shadow border-none text-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveFilter(f.id)}
              data-testid={`filter-${f.id}`}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 pt-6">
        <p className="text-sm text-muted-foreground mb-4 font-bold px-1">
          {listings.length} {listings.length === 1 ? "result" : "results"}
        </p>
        <div className="grid grid-cols-2 gap-4 pb-12">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full bg-muted rounded-3xl animate-pulse" />
            ))
          ) : listings.length > 0 ? (
            listings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))
          ) : (
            <div className="col-span-2 py-20 text-center text-muted-foreground font-medium">
              No items match your search. Try different keywords!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
