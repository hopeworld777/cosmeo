import { useParams, Link, useLocation } from "wouter";
import { ChevronLeft, Share2, Heart, ShieldCheck, MapPin, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ItemDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    async function fetchListing() {
      try {
        setLoading(true);
        const data = await api.listings.get(id);
        setListing(data);
        setIsLiked(data.is_favorited || false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background animate-pulse">
         <div className="w-full aspect-[3/4] bg-muted" />
         <div className="p-6 space-y-4">
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded w-full" />
         </div>
      </div>
    );
  }

  if (error || !listing) {
    return <div className="p-8 text-center text-foreground font-bold">Item not found</div>;
  }

  const handleLikeToggle = async () => {
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

  const handleAction = (type) => {
    if (!user) {
      toast({
        title: "Sign in to purchase",
        description: "You need an account to complete this action.",
      });
      setLocation("/login");
      return;
    }
    toast({
      title: type === 'buy' ? "Added to Cart" : "Rental Request Sent",
      description: `You are requesting ${listing.title}.`,
    });
  };

  const imageSrc = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const sellerInitial = listing.seller_username ? listing.seller_username.slice(0,2).toUpperCase() : "U";

  return (
    <div className="flex flex-col h-full bg-background relative pb-24">
      {/* Sticky Top Nav */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4">
        <Link href="~" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white card-shadow text-foreground hover:scale-105 transition-transform">
            <ChevronLeft className="h-6 w-6" />
          </div>
        </Link>
        <div className="flex gap-3">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white card-shadow text-foreground hover:scale-105 transition-transform">
            <Share2 className="h-5 w-5" />
          </div>
          <div 
            onClick={handleLikeToggle}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white card-shadow text-muted-foreground hover:scale-105 transition-transform"
          >
            <Heart className={`h-6 w-6 transition-colors ${isLiked ? 'fill-secondary text-secondary' : ''}`} />
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative w-full aspect-[3/4] bg-muted">
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={listing.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-60 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative -mt-12 rounded-t-[2.5rem] bg-white p-6 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] flex-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-primary/10 text-primary border-none uppercase tracking-wider font-bold px-3 py-1 rounded-full">{listing.fandom}</Badge>
            <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-none uppercase font-bold px-3 py-1 rounded-full">{listing.condition}</Badge>
          </div>
          
          <h1 className="text-3xl font-black leading-tight mb-3 text-foreground">{listing.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 font-bold">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary"/> {listing.location || "Online"}</span>
            <span className="flex items-center gap-1.5"><Eye className="h-4 w-4 text-secondary"/> {listing.views || 0} viewed</span>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-8 font-medium text-base">
            {listing.description}
          </p>

          {/* Seller Info */}
          <div className="flex items-center justify-between mb-8 bg-white card-shadow p-5 rounded-3xl cursor-pointer hover:-translate-y-1 transition-transform border border-border/50">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={listing.seller_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">{sellerInitial}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-extrabold text-foreground text-lg">{listing.seller_username}</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground mt-0.5">
                  <Star className="h-4 w-4 fill-secondary text-secondary" />
                  <span className="text-foreground">{listing.seller_rating || "New"}</span>
                  <span>({listing.seller_review_count || 0} reviews)</span>
                </div>
              </div>
            </div>
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 p-5 rounded-3xl">
              <p className="text-sm text-muted-foreground font-bold mb-1">Size</p>
              <p className="font-extrabold text-lg text-foreground">{listing.size}</p>
            </div>
            <div className="bg-muted/50 p-5 rounded-3xl">
              <p className="text-sm text-muted-foreground font-bold mb-1">Category</p>
              <p className="font-extrabold text-lg text-foreground capitalize">{listing.category}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-50 flex gap-3 max-w-[430px] mx-auto rounded-t-3xl">
        {listing.is_for_rent && (
          <Button 
            className="flex-1 h-16 rounded-2xl bg-secondary/10 border-2 border-secondary text-secondary hover:bg-secondary/20 hover:text-secondary" 
            variant="outline"
            onClick={() => handleAction('rent')}
            data-testid="btn-rent"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold opacity-80 uppercase tracking-wide">Rent</span>
              <span className="font-black text-lg">${listing.rent_price}<span className="text-xs font-bold opacity-70">/d</span></span>
            </div>
          </Button>
        )}
        {listing.is_for_sale && (
          <Button 
            className="flex-[2] h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-black text-xl shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:opacity-90 transition-opacity"
            onClick={() => handleAction('buy')}
            data-testid="btn-buy"
          >
            Buy for ${listing.price}
          </Button>
        )}
      </div>
    </div>
  );
}
