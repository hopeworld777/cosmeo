import { useParams, Link, useLocation } from "wouter";
import {
  ChevronLeft, Share2, Heart, ShieldCheck, MapPin,
  Eye, Star, MessageCircle, Send, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export default function ItemDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatOpen, chatMessages]);

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
      toast({ title: "Sign in to save items", description: "You need an account to save to wishlist." });
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
      toast({ title: "Sign in to purchase", description: "You need an account to complete this action." });
      setLocation("/login");
      return;
    }
    toast({
      title: type === "buy" ? "Added to Cart" : "Rental Request Sent",
      description: `You are requesting ${listing.title}.`,
    });
  };

  const openChat = async () => {
    if (!user) {
      toast({ title: "Sign in to chat", description: "You need an account to message sellers." });
      setLocation("/login");
      return;
    }
    if (listing.seller_id === user.id) {
      toast({ title: "This is your listing", description: "You can't message yourself." });
      return;
    }
    setChatOpen(true);
    if (convId) {
      loadMessages(convId);
    }
  };

  const loadMessages = async (id) => {
    try {
      setChatLoading(true);
      const msgs = await api.messages.getMessages(id);
      setChatMessages(msgs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      if (!convId) {
        const res = await api.messages.startConversation(listing.id, text);
        setConvId(res.conversation_id);
        setChatMessages([res.message]);
        toast({ title: "Message sent!", description: `Your message to ${listing.seller_username} was delivered.` });
      } else {
        const msg = await api.messages.sendMessage(convId, text);
        setChatMessages((prev) => [...prev, msg]);
      }
      setMessageText("");
    } catch (err) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const imageSrc = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const sellerInitial = listing.seller_username ? listing.seller_username.slice(0, 2).toUpperCase() : "U";
  const formatGEL = (n) => n != null ? `₾${Number(n).toFixed(0)}` : null;

  return (
    <div className="flex flex-col h-full bg-background relative pb-24">

      {/* Sticky Top Nav */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4">
        <div
          onClick={() => window.history.back()}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white card-shadow text-foreground hover:scale-105 transition-transform"
        >
          <ChevronLeft className="h-6 w-6" />
        </div>
        <div className="flex gap-3">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white card-shadow text-foreground hover:scale-105 transition-transform">
            <Share2 className="h-5 w-5" />
          </div>
          <div
            onClick={handleLikeToggle}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white card-shadow text-muted-foreground hover:scale-105 transition-transform"
          >
            <Heart className={`h-6 w-6 transition-colors ${isLiked ? "fill-secondary text-secondary" : ""}`} />
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative w-full aspect-[3/4] bg-muted">
        {imageSrc ? (
          <img src={imageSrc} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <span className="text-6xl">👗</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
      </div>

      {/* Content Card */}
      <div className="relative -mt-12 rounded-t-[2.5rem] bg-white p-6 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {listing.fandom && (
              <Badge className="bg-primary/10 text-primary border-none uppercase tracking-wider font-bold px-3 py-1 rounded-full text-xs">
                {listing.fandom}
              </Badge>
            )}
            {listing.condition && (
              <Badge className="bg-secondary/10 text-secondary border-none uppercase font-bold px-3 py-1 rounded-full text-xs">
                {listing.condition}
              </Badge>
            )}
            {listing.category && (
              <Badge variant="outline" className="border-border text-muted-foreground capitalize font-bold px-3 py-1 rounded-full text-xs">
                {listing.category}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black leading-tight mb-3 text-foreground">{listing.title}</h1>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 font-bold flex-wrap">
            {(listing.location || listing.seller_location) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                {listing.location || listing.seller_location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-secondary" />
              {listing.views || 0} viewed
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-center gap-3 mb-4">
            {listing.is_for_sale && listing.price && (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Buy</span>
                <span className="text-3xl font-black text-primary">{formatGEL(listing.price)}</span>
              </div>
            )}
            {listing.is_for_rent && listing.rent_price && (
              <div className="flex flex-col ml-4 pl-4 border-l border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Rent/day</span>
                <span className="text-2xl font-black text-secondary">{formatGEL(listing.rent_price)}</span>
              </div>
            )}
          </div>

          {/* Hand-to-Hand Exchange Banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/60 rounded-2xl px-4 py-3 mb-6">
            <span className="text-lg leading-none mt-0.5 shrink-0">📍</span>
            <p className="text-[13px] font-semibold text-amber-800 leading-snug">
              {t("handoffBanner")}
            </p>
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-muted-foreground leading-relaxed mb-8 font-medium text-base">
              {listing.description}
            </p>
          )}

          {/* Seller Card */}
          <div className="mb-6 bg-gradient-to-br from-primary/5 to-secondary/5 p-5 rounded-3xl border border-border/40">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Seller</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarImage src={listing.seller_avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">{sellerInitial}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-extrabold text-foreground text-lg leading-tight">{listing.seller_username}</p>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground mt-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-foreground">{listing.seller_rating ? Number(listing.seller_rating).toFixed(1) : "New"}</span>
                    <span>({listing.seller_review_count || 0} reviews)</span>
                  </div>
                </div>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Chat CTA inside seller card */}
            {(!user || listing.seller_id !== user.id) && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={openChat}
                className="mt-4 w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="h-5 w-5" />
                💬 {t("openChat")}
              </motion.button>
            )}
          </div>

          {/* Size & Category grid */}
          <div className="grid grid-cols-2 gap-4">
            {listing.size && (
              <div className="bg-muted/50 p-5 rounded-3xl">
                <p className="text-sm text-muted-foreground font-bold mb-1">Size</p>
                <p className="font-extrabold text-lg text-foreground">{listing.size}</p>
              </div>
            )}
            {listing.category && (
              <div className="bg-muted/50 p-5 rounded-3xl">
                <p className="text-sm text-muted-foreground font-bold mb-1">Category</p>
                <p className="font-extrabold text-lg text-foreground capitalize">{listing.category}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 flex gap-3 max-w-[430px] mx-auto rounded-t-3xl">
        {listing.is_for_rent && listing.rent_price && (
          <Button
            className="flex-1 h-16 rounded-2xl bg-secondary/10 border-2 border-secondary text-secondary hover:bg-secondary/20 hover:text-secondary"
            variant="outline"
            onClick={() => handleAction("rent")}
          >
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold opacity-80 uppercase tracking-wide">Rent</span>
              <span className="font-black text-lg">{formatGEL(listing.rent_price)}<span className="text-xs font-bold opacity-70">/d</span></span>
            </div>
          </Button>
        )}
        {listing.is_for_sale && listing.price && (
          <Button
            className="flex-[2] h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-black text-xl shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:opacity-90 transition-opacity"
            onClick={() => handleAction("buy")}
          >
            Buy for {formatGEL(listing.price)}
          </Button>
        )}
      </div>

      {/* ── Chat Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Chat Panel */}
            <motion.div
              key="panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-white rounded-t-[2rem] shadow-2xl flex flex-col"
              style={{ maxHeight: "75vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarImage src={listing.seller_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black">{sellerInitial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-extrabold text-foreground leading-tight">{listing.seller_username}</p>
                    <p className="text-xs text-muted-foreground font-medium line-clamp-1">{listing.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[120px]">
                {chatLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">👋</div>
                    <p className="text-sm font-bold text-muted-foreground">
                      Say hi to {listing.seller_username}!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ask about the item, condition, or shipping.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-snug ${
                            isMine
                              ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-6 pt-3 border-t border-border/20">
                <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${listing.seller_username}…`}
                    className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
                    disabled={sending}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
                    className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
