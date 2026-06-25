import { Link } from "wouter";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ListingCard({ listing, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const { toast } = useToast();

  const toggleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    toast({
      title: !isLiked ? "Saved to Wishlist" : "Removed from Wishlist",
      description: listing.title,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all cursor-pointer shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`listing-card-${listing.id}`}
    >
      <Link href={`/item/${listing.id}`}>
        <div className="block h-full w-full">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className={cn(
                "h-full w-full object-cover transition-transform duration-700",
                isHovered && "scale-110"
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            
            <button
              data-testid={`btn-like-${listing.id}`}
              onClick={toggleLike}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white transition-all hover:bg-black/60 hover:scale-110 active:scale-95"
            >
              <Heart className={cn("h-5 w-5 transition-colors", isLiked ? "fill-secondary text-secondary" : "text-white")} />
            </button>

            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {listing.isForRent && (
                <Badge variant="secondary" className="bg-secondary/90 text-white border-none shadow-sm backdrop-blur-md">
                  Rent ${listing.rentPrice}/d
                </Badge>
              )}
              {listing.isForSale && (
                <Badge variant="default" className="bg-primary/90 text-white border-none shadow-sm backdrop-blur-md">
                  Buy ${listing.price}
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="line-clamp-1 text-base font-semibold leading-tight text-card-foreground">
              {listing.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {listing.fandom} • {listing.size}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
