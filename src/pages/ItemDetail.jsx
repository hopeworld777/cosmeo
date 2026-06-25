import { useParams, Link } from "wouter";
import { ChevronLeft, Share2, Heart, ShieldCheck, MapPin, Eye, Star } from "lucide-react";
import { MOCK_LISTINGS, MOCK_USERS } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ItemDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  
  const listing = MOCK_LISTINGS.find(l => l.id === id);
  if (!listing) return <div className="p-8 text-center">Item not found</div>;
  
  const seller = MOCK_USERS.find(u => u.id === listing.sellerId) || MOCK_USERS[0];

  const handleAction = (type) => {
    toast({
      title: type === 'buy' ? "Added to Cart" : "Rental Request Sent",
      description: `You are requesting ${listing.title}.`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-black relative pb-24">
      {/* Sticky Top Nav */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4">
        <Link href="~" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </div>
        </Link>
        <div className="flex gap-2">
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors">
            <Share2 className="h-5 w-5" />
          </div>
          <div 
            onClick={() => setIsLiked(!isLiked)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-secondary text-secondary' : ''}`} />
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative w-full aspect-[3/4] bg-card">
        <img 
          src={listing.images[0]} 
          alt={listing.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
      </div>

      {/* Content */}
      <div className="relative -mt-10 rounded-t-3xl bg-background p-6 shadow-2xl flex-1 border-t border-border/50">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-primary border-primary/30 uppercase tracking-wider">{listing.fandom}</Badge>
            <Badge variant="secondary" className="bg-card text-muted-foreground uppercase">{listing.condition}</Badge>
          </div>
          
          <h1 className="text-3xl font-bold leading-tight mb-2">{listing.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {listing.location}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3"/> {listing.views} viewed</span>
          </div>

          <p className="text-foreground/90 leading-relaxed mb-6 font-sans">
            {listing.description}
          </p>

          <Separator className="my-6 border-border/50" />

          {/* Seller Info */}
          <div className="flex items-center justify-between mb-6 bg-card p-4 rounded-2xl border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={seller.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">{seller.username.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold">{seller.username}</p>
                <div className="flex items-center gap-1 text-sm text-secondary">
                  <Star className="h-3 w-3 fill-secondary" />
                  <span>{seller.rating} ({seller.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>

          <Separator className="my-6 border-border/50" />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-2xl border border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Size</p>
              <p className="font-bold">{listing.size}</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Category</p>
              <p className="font-bold capitalize">{listing.category}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-50 flex gap-3 max-w-[430px] mx-auto">
        {listing.isForRent && (
          <Button 
            className="flex-1 h-14 rounded-xl bg-card border border-border/50 text-foreground hover:bg-card/80 hover:text-foreground" 
            variant="outline"
            onClick={() => handleAction('rent')}
            data-testid="btn-rent"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs font-normal opacity-80">Rent for</span>
              <span className="font-bold text-base text-secondary">${listing.rentPrice}<span className="text-xs text-muted-foreground">/day</span></span>
            </div>
          </Button>
        )}
        {listing.isForSale && (
          <Button 
            className="flex-1 h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-[0_0_20px_rgba(180,60,255,0.4)]"
            onClick={() => handleAction('buy')}
            data-testid="btn-buy"
          >
            Buy • ${listing.price}
          </Button>
        )}
      </div>
    </div>
  );
}
