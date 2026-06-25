import { MOCK_LISTINGS } from "@/data/mockData";
import ListingCard from "@/components/ListingCard";

export default function Wishlist() {
  // Mock wishlist items
  const wishlist = MOCK_LISTINGS.filter((_, i) => [0, 2, 4, 7].includes(i));

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-12 pb-4 px-4">
        <h1 className="text-2xl font-bold">Wishlist</h1>
        <p className="text-muted-foreground text-sm mt-1">{wishlist.length} saved items</p>
      </div>

      <div className="flex-1 p-4 pb-24">
        {wishlist.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {wishlist.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-full bg-card border border-border/50 flex items-center justify-center mb-4">
              <span className="text-muted-foreground">No favorites yet</span>
            </div>
            <p className="text-muted-foreground">Items you save will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
