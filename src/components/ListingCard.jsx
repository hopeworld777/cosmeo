import { Link, useLocation } from "wouter";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export default function ListingCard({ listing, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(listing.is_favorited || false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (listing.is_favorited !== undefined) {
      setIsLiked(listing.is_favorited);
    }
  }, [listing.is_favorited]);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in to save items",
        description: "You need an account to save to wishlist.",
      });
      setLocation("/login");
      return;
    }

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    
    try {
      if (newLiked) {
        await api.favorites.add(listing.id);
        toast({ title: "Saved to Wishlist", description: listing.title });
      } else {
        await api.favorites.remove(listing.id);
        toast({ title: "Removed from Wishlist", description: listing.title });
      }
    } catch (err) {
      setIsLiked(!newLiked);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const imageSrc = listing.images && listing.images.length > 0 ? listing.images[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white card-shadow transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl border-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`listing-card-${listing.id}`}
    >
      <Link href={`/item/${listing.id}`}>
        <div className="block h-full w-full">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted rounded-t-3xl">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
            
            <button
              data-testid={`btn-like-${listing.id}`}
              onClick={toggleLike}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white card-shadow text-muted-foreground transition-all hover:scale-110 active:scale-95"
            >
              <Heart className={cn("h-5 w-5 transition-colors", isLiked ? "fill-secondary text-secondary" : "")} />
            </button>

            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {listing.is_for_rent && (
                <Badge variant="secondary" className="bg-secondary/90 text-white border-none shadow-sm backdrop-blur-md rounded-full px-2.5 py-0.5">
                  Rent ${listing.rent_price}/d
                </Badge>
              )}
              {listing.is_for_sale && (
                <Badge variant="default" className="bg-primary/90 text-white border-none shadow-sm backdrop-blur-md rounded-full px-2.5 py-0.5">
                  Buy ${listing.price}
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4 pt-5">
            <h3 className="line-clamp-1 text-lg font-bold leading-tight text-foreground">
              {listing.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1 font-medium">
              {listing.fandom} • {listing.size}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
