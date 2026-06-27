import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListingCard from "@/components/ListingCard";
import CityPicker from "@/components/CityPicker";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import HeaderControls from "@/components/HeaderControls";

export default function Browse() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [appliedCity, setAppliedCity] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");

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
    window.addEventListener("kosmeo:listingChanged", fetchListings);
    return () => window.removeEventListener("kosmeo:listingChanged", fetchListings);
  }, [debouncedSearch, activeFilter, initialCategory]);

  const displayed = useMemo(() => {
    return listings.filter(l => {
      const loc = (l.seller_location || l.location || "").toLowerCase();
      if (appliedCity && loc !== appliedCity.toLowerCase()) return false;
      if (appliedMaxPrice) {
        const price = Number(l.price ?? l.rent_price ?? 0);
        if (price > Number(appliedMaxPrice)) return false;
      }
      return true;
    });
  }, [listings, appliedCity, appliedMaxPrice]);

  const hasActiveAdvFilters = appliedCity || appliedMaxPrice;

  function applyFilters() {
    setAppliedCity(cityFilter);
    setAppliedMaxPrice(maxPrice);
    setFilterOpen(false);
  }

  function resetFilters() {
    setCityFilter("");
    setMaxPrice("");
    setAppliedCity("");
    setAppliedMaxPrice("");
    setFilterOpen(false);
  }

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pb-4 pt-12 md:pt-6 px-4 rounded-b-3xl" style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.05)" }}>
        <div className="md:max-w-6xl md:mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-3xl font-black text-foreground">{t("discover")}</h1>
          <HeaderControls />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder={t("searchBrowsePlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-white card-shadow border-none h-14 rounded-2xl text-base font-medium placeholder:text-muted-foreground/70"
              data-testid="input-browse-search"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className={`relative h-14 w-14 rounded-2xl shrink-0 bg-white card-shadow border-none flex items-center justify-center transition-colors ${
              hasActiveAdvFilters ? "text-white bg-primary shadow-[0_4px_14px_rgba(124,58,237,0.35)]" : "text-primary"
            }`}
            data-testid="btn-filters"
          >
            <SlidersHorizontal className="h-6 w-6" />
            {hasActiveAdvFilters && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-secondary text-white text-[9px] font-black flex items-center justify-center">
                {[appliedCity, appliedMaxPrice].filter(Boolean).length}
              </span>
            )}
          </button>
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
      </div>

      {/* ── Grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 pt-6 md:max-w-6xl md:mx-auto md:w-full">
        <p className="text-sm text-muted-foreground mb-4 font-bold px-1">
          {displayed.length} {displayed.length === 1 ? t("result") : t("results")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full bg-muted rounded-3xl animate-pulse" />
            ))
          ) : displayed.length > 0 ? (
            displayed.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))
          ) : (
            <div className="col-span-2 py-20 text-center text-muted-foreground font-medium">
              {t("noResults")}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Sheet ──────────────────────────────────────────── */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            <motion.div
              key="filter-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-[430px] md:max-w-lg mx-auto z-50 bg-white rounded-t-[2rem] shadow-2xl"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="px-6 pt-2 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-foreground">{t("filterTitle")}</h3>
                  <button
                    onClick={() => setFilterOpen(false)}
                    className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* City */}
                <div className="mb-5">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                    {t("cityFilter")}
                  </label>
                  <CityPicker
                    value={cityFilter}
                    onChange={setCityFilter}
                    showAny
                  />
                </div>

                {/* Max Price */}
                <div className="mb-8">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                    {t("maxPrice")}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-primary">₾</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      placeholder="500"
                      className="w-full h-12 rounded-xl bg-muted border-none pl-10 pr-4 text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/40 placeholder:font-normal"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[50, 100, 200, 500].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMaxPrice(String(v))}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-colors ${
                          maxPrice === String(v)
                            ? "bg-primary text-white"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        ₾{v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={resetFilters}
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl border-border font-bold text-base"
                  >
                    {t("resetFilters")}
                  </Button>
                  <Button
                    type="button"
                    onClick={applyFilters}
                    className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-[0_4px_14px_rgba(124,58,237,0.3)]"
                  >
                    {t("applyFilters")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
