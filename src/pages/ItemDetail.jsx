import { useParams, Link, useLocation } from "wouter";
import {
  ChevronLeft, Share2, Heart, ShieldCheck, MapPin,
  Eye, Star, MessageCircle, Send, X, Loader2, Calendar, Tag, Package,
  Ruler, Truck, ListChecks, Sparkles, ChevronRight
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
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VerifiedBadge from "@/components/VerifiedBadge";
import ConfirmModal from "@/components/ConfirmModal";
import { getThumbUrl } from "@/lib/imageUtils";

// ── Image Gallery — contained aspect-ratio hero + click-through thumbnails ──
// Never full page height: the main frame is capped by an aspect ratio, and
// thumbnails live below/beside it so a multi-photo listing never forces a
// giant scroll before any info is visible.
function ImageGallery({ images, title, isSold }) {
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [images]);

  const hasImages = images && images.length > 0;
  const activeSrc = hasImages ? images[active] : null;

  return (
    <div>
      <div className="relative w-full aspect-square sm:aspect-[4/5] rounded-3xl overflow-hidden bg-muted card-shadow">
        <AnimatePresence mode="wait">
          {activeSrc ? (
            <motion.img
              key={activeSrc}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              src={activeSrc}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
              <Package className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
        </AnimatePresence>

        {isSold && (
          <div className="absolute top-4 left-4 z-10">
            <Badge className="bg-amber-500 text-white border-none uppercase tracking-wider font-black px-3 py-1.5 rounded-full text-xs shadow-lg flex items-center gap-1">
              <Tag className="h-3 w-3" />Sold
            </Badge>
          </div>
        )}

        {hasImages && images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-xs font-bold tabular-nums">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {hasImages && images.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${title} photo ${i + 1}`}
              className={`relative shrink-0 h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-2xl overflow-hidden transition-all ${
                i === active
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <img src={getThumbUrl(src)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Below-fold info section — glass card with icon header, hidden entirely
// when it has nothing to show (caller passes hasContent). ──────────────────
function InfoSection({ icon: Icon, title, hasContent, children }) {
  if (!hasContent) return null;
  return (
    <div className="rounded-3xl bg-card/80 backdrop-blur-sm border border-border/40 card-shadow p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-base font-black text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-b-0">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-sm font-extrabold text-foreground text-right">{value}</span>
    </div>
  );
}

// ── Seller Review Modal — buyer rates the seller from a sold listing ──────────
function SellerReviewModal({ listing, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (rating === 0) { toast({ title: "Pick a star rating", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await api.reviews.submit({
        listing_id: listing.id,
        seller_id: listing.seller_id,
        rating,
        comment: comment.trim() || null,
        review_type: "seller",
      });
      setDone(true);
      if (onSubmitted) onSubmitted(rating);
    } catch (err) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <>
      <motion.div key="sr-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
      <motion.div key="sr-sheet"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-card rounded-t-[2rem] shadow-2xl"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="px-6 pt-2 pb-10">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="sr-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center">
                <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Star className="h-10 w-10 text-amber-400 fill-amber-400" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Review Submitted!</h3>
                <p className="text-muted-foreground font-medium">
                  You rated <span className="text-foreground font-extrabold">@{listing.seller_username}</span> {rating}/5 ★
                </p>
                <Button onClick={onClose}
                  className="mt-8 w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base">
                  Done
                </Button>
              </motion.div>
            ) : (
              <motion.div key="sr-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-2xl font-black text-foreground">Rate the Seller</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-0.5">@{listing.seller_username}</p>
                  </div>
                  <button onClick={onClose} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex flex-col items-center mb-6">
                  <div className="flex gap-3 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button key={s} whileTap={{ scale: 0.85 }}
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}>
                        <Star className={`h-10 w-10 transition-all ${s <= (hovered || rating) ? "fill-amber-400 text-amber-400 scale-110" : "text-muted-foreground/30"}`} />
                      </motion.button>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    {(hovered || rating) > 0 && (
                      <motion.p key={hovered || rating} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm font-extrabold text-amber-500">
                        {labels[hovered || rating]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div className="mb-6">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Comment (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Item as described? Fast handoff? Good communication…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-muted text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground/50 placeholder:font-normal resize-none"
                  />
                </div>
                <Button onClick={submit} disabled={loading || rating === 0}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-base shadow-md hover:opacity-90 disabled:opacity-40">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Star className="h-4 w-4 mr-1.5" />Submit Review</>}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

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

  const [rateSellerOpen, setRateSellerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      <div className="min-h-full bg-background animate-pulse">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 lg:px-8 lg:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
            <div className="w-full aspect-square sm:aspect-[4/5] rounded-3xl bg-muted" />
            <div className="mt-5 lg:mt-0 space-y-4">
              <div className="h-8 bg-muted rounded-full w-2/3" />
              <div className="h-4 bg-muted rounded-full w-1/2" />
              <div className="h-24 bg-muted rounded-3xl w-full" />
              <div className="h-14 bg-muted rounded-2xl w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return <div className="p-8 text-center text-foreground font-bold">{t("itemNotFound")}</div>;
  }

  const isOwner = !!(user && listing && user.id === listing.seller_id);

  const handleShare = async () => {
    const url = `${window.location.origin}/item/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: t("linkCopied") });
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: t("linkCopied") });
      } catch {
        toast({ title: t("linkCopyFailed"), variant: "destructive" });
      }
    }
  };

  const handleDelete = () => setDeleteConfirmOpen(true);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.listings.delete(id);
      window.dispatchEvent(new Event("kosmeo:listingChanged"));
      toast({ title: t("listingDeleted") });
      setDeleteConfirmOpen(false);
      setLocation("/profile");
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const handleToggleSold = async () => {
    const isSold = listing.status === "sold";
    setListing(prev => ({ ...prev, status: isSold ? "active" : "sold", is_active: isSold }));
    try {
      if (isSold) {
        await api.listings.markAvailable(id);
        window.dispatchEvent(new Event("kosmeo:listingChanged"));
        toast({ title: t("markedAsAvailable") });
      } else {
        await api.listings.markSold(id);
        window.dispatchEvent(new Event("kosmeo:listingChanged"));
        toast({ title: t("markedAsSold") });
      }
    } catch (err) {
      setListing(prev => ({ ...prev, status: isSold ? "sold" : "active", is_active: !isSold }));
      const description = err.message === "listing_limit_reached"
        ? t("listingLimitBody")
        : err.message;
      toast({ title: t("error"), description, variant: "destructive" });
    }
  };

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

  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const sellerInitial = listing.seller_username ? listing.seller_username.slice(0, 2).toUpperCase() : "U";
  const formatGEL = (n) => n != null ? `₾${Number(n).toFixed(0)}` : null;
  const isSold = listing.status === "sold";
  const memberSinceYear = listing.seller_created_at ? new Date(listing.seller_created_at).getFullYear() : null;
  const description = listing.description || "";
  const descIsLong = description.length > 220;
  const rentalDurationText = listing.rental_duration === "custom"
    ? listing.rental_duration_custom
    : listing.rental_duration ? t(`rentalDuration_${listing.rental_duration}`) : null;

  const hasCostumeDetails = !!(listing.fandom || listing.brand || listing.category);
  const hasIncludedItems = Array.isArray(listing.included_items) && listing.included_items.length > 0;
  const hasSizeInfo = !!(listing.size || listing.height_range || listing.measurements || listing.shoe_size);
  const hasRentalRules = listing.is_for_rent && !!(listing.deposit_amount || rentalDurationText || listing.care_instructions || listing.damage_policy);
  const hasDelivery = !!(listing.delivery_method || listing.location || listing.seller_location);

  // ── Shared CTA block — rendered once in the sticky right panel, used on
  // both mobile (flows right after the gallery) and desktop (sticky sidebar).
  const ctaBlock = isOwner ? (
    <div className="flex gap-3">
      <Button
        variant="outline"
        className={`flex-1 h-14 rounded-2xl border-2 font-bold transition-colors ${
          isSold
            ? "border-muted-foreground/40 bg-muted/50 text-muted-foreground hover:bg-muted hover:border-muted-foreground/60"
            : "border-secondary bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary"
        }`}
        onClick={handleToggleSold}
      >
        <span className="text-sm font-black leading-tight">
          {isSold ? t("markAsAvailable") : t("markAsSold")}
        </span>
      </Button>
      <Button
        className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm shadow-[0_8px_20px_rgba(239,68,68,0.25)] transition-colors"
        onClick={handleDelete}
      >
        {t("deleteListing")}
      </Button>
    </div>
  ) : isSold ? (
    user && listing.seller_id !== user.id ? (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setRateSellerOpen(true)}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black text-base flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity"
      >
        <Star className="h-5 w-5 fill-white" />
        Rate this Seller
      </motion.button>
    ) : (
      <div className="w-full h-14 rounded-2xl bg-muted/60 border-2 border-muted flex items-center justify-center gap-2">
        <Tag className="h-5 w-5 text-muted-foreground/60" />
        <span className="font-black text-sm text-muted-foreground">{t("itemSoldNote")}</span>
      </div>
    )
  ) : (
    <div className="flex gap-3">
      {listing.is_for_rent && listing.rent_price && (
        <Button
          className="flex-1 h-14 rounded-2xl bg-secondary/10 border-2 border-secondary text-secondary hover:bg-secondary/20 hover:text-secondary"
          variant="outline"
          onClick={openChat}
        >
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold opacity-80 uppercase tracking-wide">{t("rentDay")}</span>
            <span className="font-black text-base">{formatGEL(listing.rent_price)}<span className="text-xs font-bold opacity-70">/d</span></span>
          </div>
        </Button>
      )}
      {listing.is_for_sale && listing.price && (
        <Button
          className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-black text-lg shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:opacity-90 transition-opacity"
          onClick={openChat}
        >
          <MessageCircle className="h-5 w-5 mr-1.5" />
          {t("messageSeller")}
        </Button>
      )}
      {!listing.is_for_sale && listing.is_for_rent && !listing.rent_price && (
        <Button
          className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-black text-lg shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:opacity-90 transition-opacity"
          onClick={openChat}
        >
          <MessageCircle className="h-5 w-5 mr-1.5" />
          {t("messageSeller")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-background pb-10 sm:pb-16">

      {/* Top toolbar — in normal flow (not overlaid on the image), so the
          gallery below never has to fight for contrast against controls. */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <button
          onClick={() => window.history.back()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card card-shadow text-foreground hover:scale-105 transition-transform"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button onClick={handleShare} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card card-shadow text-foreground hover:scale-105 transition-transform">
            <Share2 className="h-5 w-5" />
          </button>
          <button
            onClick={handleLikeToggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card card-shadow text-muted-foreground hover:scale-105 transition-transform"
          >
            <Heart className={`h-6 w-6 transition-colors ${isLiked ? "fill-secondary text-secondary" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* ── Two-column hero: gallery (left, ~58%) + sticky info panel (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] lg:gap-10 xl:gap-14">

          {/* LEFT — image gallery */}
          <div>
            <ImageGallery images={images} title={listing.title} isSold={isSold} />
          </div>

          {/* RIGHT — sticky listing info panel */}
          <div className="mt-5 lg:mt-0">
            <div className="lg:sticky lg:top-6 rounded-3xl bg-card/70 backdrop-blur-md border border-border/40 card-shadow p-5 sm:p-6 space-y-5">

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {listing.is_for_sale && (
                  <Badge className="bg-primary text-primary-foreground border-none font-black px-3 py-1 rounded-full text-xs uppercase tracking-wide">
                    {t("saleBadge")}
                  </Badge>
                )}
                {listing.is_for_rent && (
                  <Badge className="bg-secondary text-secondary-foreground border-none font-black px-3 py-1 rounded-full text-xs uppercase tracking-wide">
                    {t("rentBadge")}
                  </Badge>
                )}
                {isSold && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider font-black px-3 py-1 rounded-full text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" />{t("soldLabel")}
                  </Badge>
                )}
                {listing.condition && (
                  <Badge variant="outline" className="border-border text-muted-foreground font-bold px-3 py-1 rounded-full text-xs">
                    {listing.condition}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black leading-tight text-foreground">{listing.title}</h1>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold flex-wrap -mt-1">
                {(listing.location || listing.seller_location) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {listing.location || listing.seller_location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-secondary" />
                  {listing.views || 0} {t("viewedLabel")}
                </span>
                {listing.sold_at && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Calendar className="h-3.5 w-3.5" />
                    Sold {new Date(listing.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>

              {/* Seller profile preview + trust indicators */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/30">
                <Avatar className="h-11 w-11 border-2 border-primary/20 shrink-0">
                  <AvatarImage src={listing.seller_avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black">{sellerInitial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-foreground text-sm leading-tight flex items-center gap-1.5 truncate">
                    {listing.seller_username}
                    {listing.seller_is_verified && <VerifiedBadge size={14} />}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mt-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-foreground">{listing.seller_rating ? Number(listing.seller_rating).toFixed(1) : t("newSeller")}</span>
                    {listing.seller_review_count > 0 && <span>({listing.seller_review_count} {t("reviewsLabel")})</span>}
                  </div>
                </div>
                <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 flex-wrap">
                {listing.is_for_sale && listing.price && (
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{t("priceLabel")}</span>
                    <span className="text-3xl font-black text-primary">{formatGEL(listing.price)}</span>
                  </div>
                )}
                {listing.is_for_rent && listing.rent_price && (
                  <div className={`flex flex-col ${listing.is_for_sale ? "ml-2 pl-4 border-l border-border" : ""}`}>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{t("rentDay")}</span>
                    <span className="text-2xl font-black text-secondary">{formatGEL(listing.rent_price)}</span>
                  </div>
                )}
              </div>

              {/* Main CTA */}
              {ctaBlock}

              {/* Hand-to-hand + safety reminder, compact */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/60 rounded-2xl px-3.5 py-2.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-semibold text-amber-800 leading-snug">
                    {t("handoffBanner")}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />{t("safetyMeetReminder")}
                  </span>
                  <Link href="/terms">
                    <span className="text-[11px] font-bold text-primary hover:underline cursor-pointer">
                      {t("readSafetyGuide")} →
                    </span>
                  </Link>
                </div>
              </div>

              {/* Short summary */}
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {description}
                </p>
              )}

              {/* Key details chips */}
              {(listing.size || listing.category || listing.fandom) && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("keyDetails")}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {listing.size && (
                      <div className="bg-muted/50 px-3.5 py-2.5 rounded-xl">
                        <p className="text-[11px] text-muted-foreground font-bold mb-0.5">{t("size")}</p>
                        <p className="font-extrabold text-sm text-foreground">{listing.size}</p>
                      </div>
                    )}
                    {listing.category && (
                      <div className="bg-muted/50 px-3.5 py-2.5 rounded-xl">
                        <p className="text-[11px] text-muted-foreground font-bold mb-0.5">{t("category")}</p>
                        <p className="font-extrabold text-sm text-foreground capitalize">{listing.category}</p>
                      </div>
                    )}
                    {listing.fandom && (
                      <div className="bg-muted/50 px-3.5 py-2.5 rounded-xl col-span-2">
                        <p className="text-[11px] text-muted-foreground font-bold mb-0.5">{t("fandomLabel")}</p>
                        <p className="font-extrabold text-sm text-foreground">{listing.fandom}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Below-the-fold organized sections ───────────────────────── */}
        <div className="mt-8 lg:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

          <InfoSection icon={Sparkles} title={t("descriptionSection")} hasContent={!!description}>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium whitespace-pre-wrap">
              {descIsLong && !descExpanded ? `${description.slice(0, 220).trim()}…` : description}
            </p>
            {descIsLong && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-2 text-xs font-bold text-primary hover:underline"
              >
                {descExpanded ? t("viewLessDescription") : t("viewFullDescription")}
              </button>
            )}
          </InfoSection>

          <InfoSection icon={Tag} title={t("costumeDetailsSection")} hasContent={hasCostumeDetails}>
            <div className="space-y-0.5">
              <DetailRow label={t("fandomLabel")} value={listing.fandom} />
              <DetailRow label={t("brandLabel")} value={listing.brand && t(`brand_${listing.brand}`, { defaultValue: listing.brand })} />
              <DetailRow label={t("categoryLabel")} value={listing.category} />
            </div>
          </InfoSection>

          <InfoSection icon={ListChecks} title={t("includedItemsSection")} hasContent={hasIncludedItems}>
            <ul className="space-y-1.5">
              {(listing.included_items || []).map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </InfoSection>

          <InfoSection icon={Ruler} title={t("sizeInformationSection")} hasContent={hasSizeInfo}>
            <div className="space-y-0.5">
              <DetailRow label={t("size")} value={listing.size} />
              <DetailRow label={t("heightRangeLabel")} value={listing.height_range} />
              <DetailRow label={t("measurementsLabel")} value={listing.measurements} />
              <DetailRow label={t("shoeSizeLabel")} value={listing.shoe_size} />
            </div>
          </InfoSection>

          <InfoSection icon={ShieldCheck} title={t("conditionSection")} hasContent={!!listing.condition}>
            <p className="text-sm font-extrabold text-foreground">{listing.condition}</p>
          </InfoSection>

          <InfoSection icon={Calendar} title={t("rentalRulesSection")} hasContent={hasRentalRules}>
            <div className="space-y-0.5">
              <DetailRow label={t("depositLabel")} value={formatGEL(listing.deposit_amount)} />
              <DetailRow label={t("rentalDurationLabel")} value={rentalDurationText} />
              <DetailRow label={t("careInstructionsLabel")} value={listing.care_instructions} />
              <DetailRow label={t("damagePolicyLabel")} value={listing.damage_policy} />
            </div>
          </InfoSection>

          <InfoSection icon={Truck} title={t("deliveryOptionsSection")} hasContent={hasDelivery}>
            <div className="space-y-0.5">
              <DetailRow label={t("deliveryMethodLabel")} value={listing.delivery_method && t(`delivery_${listing.delivery_method}`)} />
              <DetailRow label={t("locationLabel")} value={listing.location || listing.seller_location} />
            </div>
          </InfoSection>

          <InfoSection icon={Star} title={t("sellerInformationSection")} hasContent={true}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                <AvatarImage src={listing.seller_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-black">{sellerInitial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-extrabold text-foreground text-sm leading-tight flex items-center gap-1.5 truncate">
                  {listing.seller_username}
                  {listing.seller_is_verified && <VerifiedBadge size={14} />}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {listing.seller_rating ? Number(listing.seller_rating).toFixed(1) : t("newSeller")}
                  </span>
                  {listing.seller_sales > 0 && <span>{t("salesCountLabel", { count: listing.seller_sales })}</span>}
                  {memberSinceYear && <span>{t("memberSince", { year: memberSinceYear })}</span>}
                </div>
              </div>
            </div>
            {listing.seller_bio && (
              <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-3">{listing.seller_bio}</p>
            )}
            {!isOwner && (
              <button
                onClick={openChat}
                className="w-full h-11 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {t("messageSeller")}
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>
            )}
          </InfoSection>
        </div>
      </div>

      {/* ── Chat Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            <motion.div
              key="panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-card rounded-t-[2rem] shadow-2xl flex flex-col"
              style={{ maxHeight: "75vh" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarImage src={listing.seller_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black">{sellerInitial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-extrabold text-foreground leading-tight flex items-center gap-1.5">
                      {listing.seller_username}
                      {listing.seller_is_verified && <VerifiedBadge size={14} />}
                    </p>
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

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[120px]">
                {chatLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">👋</div>
                    <p className="text-sm font-bold text-muted-foreground">
                      {t("chatSayHi", { seller: listing.seller_username })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("chatStartHint")}
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

      {/* ── Rate Seller Overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {rateSellerOpen && listing && (
          <SellerReviewModal
            listing={listing}
            onClose={() => setRateSellerOpen(false)}
            onSubmitted={() => setTimeout(() => setRateSellerOpen(false), 2500)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Listing Confirmation ──────────────────────────────────── */}
      <ConfirmModal
        open={deleteConfirmOpen}
        variant="destructive"
        title={t("deleteListingTitle", "Delete Listing?")}
        description={t("deleteListingDescription", "Are you sure you want to delete this listing? This action cannot be undone.")}
        confirmLabel={t("deleteListing", "Delete Listing")}
        loading={isDeleting}
        onCancel={() => { if (!isDeleting) setDeleteConfirmOpen(false); }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
