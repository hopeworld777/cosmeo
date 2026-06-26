import { Link, useLocation } from "wouter";
import { Heart, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export default function ListingCard({ listing, index = 0 }) {
  const [isLiked, setIsLiked] = useState(listing.is_favorited || false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (listing.is_favorited !== undefined) setIsLiked(listing.is_favorited);
  }, [listing.is_favorited]);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in to save items", description: "Create a free account to build your wishlist." });
      setLocation("/login");
      return;
    }
    const next = !isLiked;
    setIsLiked(next);
    try {
      if (next) {
        await api.favorites.add(listing.id);
        toast({ title: "Saved to Wishlist", description: listing.title });
      } else {
        await api.favorites.remove(listing.id);
        toast({ title: "Removed from Wishlist" });
      }
    } catch (err) {
      setIsLiked(!next);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const imageSrc = listing.images?.[0] ?? null;
  const city = listing.location || listing.seller_location || null;
  const rating = listing.seller_rating ? Number(listing.seller_rating).toFixed(1) : null;

  // Format price in GEL
  const formatGEL = (n) => n != null ? `₾${Number(n).toFixed(0)}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white card-shadow cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all border-none"
      data-testid={`listing-card-${listing.id}`}
    >
      <Link href={`/item/${listing.id}`}>
        <div className="block h-full w-full">

          {/* ── Image area ─────────────────────────────────────────── */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted rounded-t-3xl">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={listing.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/10 to-secondary/10" />
            )}

            {/* Heart button */}
            <button
              data-testid={`btn-like-${listing.id}`}
              onClick={toggleLike}
              className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md text-muted-foreground transition-all hover:scale-110 active:scale-95"
            >
              <Heart className={cn("h-4 w-4 transition-colors", isLiked ? "fill-secondary text-secondary" : "")} />
            </button>

            {/* Price badges */}
            <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
              {listing.is_for_rent && listing.rent_price && (
                <Badge className="bg-secondary/90 text-white border-none text-[10px] font-bold px-2 py-0.5 rounded-full shadow backdrop-blur-sm">
                  {formatGEL(listing.rent_price)}/d
                </Badge>
              )}
              {listing.is_for_sale && listing.price && (
                <Badge className="bg-primary/90 text-white border-none text-[10px] font-bold px-2 py-0.5 rounded-full shadow backdrop-blur-sm">
                  {formatGEL(listing.price)}
                </Badge>
              )}
            </div>
          </div>

          {/* ── Card body ──────────────────────────────────────────── */}
          <div className="p-3 pt-3.5 pb-4">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground mb-2">
              {listing.title}
            </h3>

            {/* Rating + City row */}
            <div className="flex items-center justify-between gap-1">
              {rating ? (
                <div className="flex items-center gap-1 min-w-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-foreground">{rating}</span>
                  {listing.seller_review_count > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      ({listing.seller_review_count})
                    </span>
                  )}
                </div>
              ) : <div />}

              {city && (
                <div className="flex items-center gap-0.5 min-w-0 shrink-0">
                  <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[60px]">
                    {city}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </Link>
    </motion.div>
  );
}
