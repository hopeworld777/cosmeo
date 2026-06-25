import ListingCard from "@/components/ListingCard";
import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishlist() {
      try {
        const data = await api.favorites.list();
        setWishlist(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchWishlist();
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-5 px-4 rounded-b-3xl shadow-sm">
        <h1 className="text-3xl font-black text-foreground">Wishlist</h1>
        <p className="text-primary font-bold text-sm mt-2">{wishlist.length} saved items</p>
      </div>

      <div className="flex-1 p-4 pt-6 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="aspect-[3/4] w-full bg-muted rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : wishlist.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {wishlist.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center py-20">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground font-medium max-w-[200px]">Items you save will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
