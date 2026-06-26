import {
  Settings, LogOut, Package, Star, ShoppingBag, Heart, ChevronRight,
  Wallet, ArrowDownToLine, CheckCircle2, Trash2, Tag, X, Loader2,
  AlertCircle, TrendingUp
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// ── Withdraw Modal ─────────────────────────────────────────────────────────────
function WithdrawModal({ balance, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("TBC");
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [withdrawn, setWithdrawn] = useState(0);
  const { toast } = useToast();
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  async function submit() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!account.trim() || account.trim().length < 4) {
      toast({ title: "Enter a valid account number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.wallet.withdraw({ amount: amt, account_number: account.trim(), bank });
      setWithdrawn(res.withdrawn);
      setDone(true);
      onSuccess(res.new_balance);
    } catch (err) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-white rounded-t-[2rem] shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-6 pt-2 pb-10">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Withdrawal Sent!</h3>
                <p className="text-muted-foreground font-medium leading-relaxed mb-1">
                  <span className="text-foreground font-black">₾{withdrawn.toFixed(2)}</span> is being transferred to your {bank} account.
                </p>
                <p className="text-xs text-muted-foreground mt-1">Processing time: 1–2 business days</p>
                <Button
                  onClick={onClose}
                  className="mt-8 w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base"
                >
                  Done
                </Button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-foreground">Cash Out</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-0.5">
                      Available: <span className="text-foreground font-extrabold">₾{Number(balance).toFixed(2)}</span>
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Amount (GEL)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-primary">₾</span>
                    <input
                      ref={inputRef}
                      type="number"
                      min="1"
                      max={balance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 h-16 rounded-2xl bg-muted text-2xl font-black text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[10, 25, 50, 100].filter(v => v <= balance).map(v => (
                      <button
                        key={v}
                        onClick={() => setAmount(String(v))}
                        className="flex-1 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-black hover:bg-primary/20 transition-colors"
                      >
                        ₾{v}
                      </button>
                    ))}
                    {balance > 0 && (
                      <button
                        onClick={() => setAmount(String(balance))}
                        className="flex-1 py-1.5 rounded-xl bg-secondary/10 text-secondary text-xs font-black hover:bg-secondary/20 transition-colors"
                      >
                        All
                      </button>
                    )}
                  </div>
                </div>

                {/* Bank selector */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Bank
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["TBC", "BOG", "Other"].map((b) => (
                      <button
                        key={b}
                        onClick={() => setBank(b)}
                        className={`py-3 rounded-2xl text-sm font-extrabold transition-all ${
                          bank === b
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account number */}
                <div className="mb-6">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    {bank === "Other" ? "Account / IBAN" : `${bank} Account Number`}
                  </label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={bank === "Other" ? "GE00XX0000000000000000" : "Enter account number"}
                    className="w-full px-4 h-14 rounded-2xl bg-muted text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground/50 placeholder:font-normal"
                  />
                </div>

                {/* Disclaimer */}
                <div className="flex gap-2 bg-amber-50 rounded-2xl p-3 mb-5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-medium leading-snug">
                    This is a simulated withdrawal for demo purposes. No real funds will be transferred.
                  </p>
                </div>

                <Button
                  onClick={submit}
                  disabled={loading || !amount || !account}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowDownToLine className="h-5 w-5 mr-2" />
                      Withdraw ₾{amount || "0"}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

// ── Review Modal ───────────────────────────────────────────────────────────────
function ReviewModal({ listing, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  async function submit() {
    if (rating === 0) { toast({ title: "Pick a star rating", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await api.reviews.submit({
        listing_id: listing.id,
        seller_id: user.id,   // seller reviews themselves as mock buyer flow
        rating,
        comment: comment.trim() || null,
      });
      setDone(true);
      onSubmitted(rating);
    } catch (err) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <>
      <motion.div key="rv-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
      <motion.div key="rv-sheet"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-white rounded-t-[2rem] shadow-2xl"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="px-6 pt-2 pb-10">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="rv-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 text-center">
                <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Star className="h-10 w-10 text-amber-400 fill-amber-400" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Review Saved!</h3>
                <p className="text-muted-foreground font-medium">
                  You rated this transaction <span className="text-foreground font-extrabold">{rating}/5 ★</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Your seller rating has been updated.</p>
                <Button onClick={onClose}
                  className="mt-8 w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base">
                  Done
                </Button>
              </motion.div>
            ) : (
              <motion.div key="rv-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-2xl font-black text-foreground">Rate the Sale</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-0.5 line-clamp-1">
                      {listing.title}
                    </p>
                  </div>
                  <button onClick={onClose}
                    className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Stars */}
                <div className="flex flex-col items-center mb-6">
                  <div className="flex gap-3 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button key={s} whileTap={{ scale: 0.85 }}
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                      >
                        <Star className={`h-10 w-10 transition-all ${
                          s <= (hovered || rating)
                            ? "fill-amber-400 text-amber-400 scale-110"
                            : "text-muted-foreground/30"
                        }`} />
                      </motion.button>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    {(hovered || rating) > 0 && (
                      <motion.p key={hovered || rating}
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm font-extrabold text-amber-500">
                        {labels[hovered || rating]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Comment */}
                <div className="mb-6">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Comment (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="How did the transaction go? Fast delivery, item as described…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-muted text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground/50 placeholder:font-normal resize-none"
                  />
                </div>

                <div className="flex gap-3 bg-primary/5 rounded-2xl p-3 mb-5">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/70 font-medium leading-snug">
                    This simulates a buyer review to update your seller rating on the platform.
                  </p>
                </div>

                <Button onClick={submit} disabled={loading || rating === 0}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-base shadow-md hover:opacity-90 disabled:opacity-40">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "⭐ Submit Review"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

// ── My Listings Panel ──────────────────────────────────────────────────────────
function MyListings({ onSold }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewListing, setReviewListing] = useState(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    api.listings.me()
      .then((data) => setListings(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkSold = async (listing) => {
    try {
      await api.listings.markSold(listing.id);
      setListings((prev) =>
        prev.map((l) => l.id === listing.id ? { ...l, status: "sold", is_active: false } : l)
      );
      const salePrice = Number(listing.price || listing.rent_price || 0);
      if (salePrice > 0 && onSold) onSold(salePrice);
      toast({ title: "Marked as sold! ✅", description: "Now rate the transaction." });
      setReviewListing(listing);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.listings.delete(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Listing removed" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 w-full bg-muted rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-3">
          <Package className="h-7 w-7 text-primary" />
        </div>
        <p className="font-extrabold text-foreground mb-1">{t("noListingsYet")}</p>
        <p className="text-sm text-muted-foreground mb-4">{t("startSelling")}</p>
        <button
          onClick={() => setLocation("/sell")}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
        >
          {t("createListing")}
        </button>
      </div>
    );
  }

  const statusConfig = {
    active:  { label: "Active",  bg: "bg-green-100",  text: "text-green-700"  },
    sold:    { label: "Sold",    bg: "bg-amber-100",  text: "text-amber-700"  },
    deleted: { label: "Removed", bg: "bg-red-100",    text: "text-red-700"    },
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {listings.map((l, i) => {
          const img = l.images?.[0] ?? null;
          const sc = statusConfig[l.status] || statusConfig.active;
          const isActive = l.status === "active";

          return (
            <motion.div
              key={l.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 bg-white rounded-3xl card-shadow p-3"
            >
              {/* Thumbnail */}
              <div className="h-18 w-16 shrink-0 rounded-2xl overflow-hidden bg-muted">
                {img ? (
                  <img src={img} alt={l.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-primary/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-sm text-foreground line-clamp-1 leading-tight">{l.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                  {l.price && l.is_for_sale && (
                    <span className="text-xs font-bold text-primary">₾{Number(l.price).toFixed(0)}</span>
                  )}
                  {l.rent_price && l.is_for_rent && (
                    <span className="text-xs font-bold text-secondary">₾{Number(l.rent_price).toFixed(0)}/d</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isActive && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleMarkSold(l)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-50 text-green-700 text-[11px] font-bold hover:bg-green-100 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Sold
                  </button>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 text-red-500 text-[11px] font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Review modal — appears after marking sold */}
      <AnimatePresence>
        {reviewListing && (
          <ReviewModal
            listing={reviewListing}
            onClose={() => setReviewListing(null)}
            onSubmitted={() => setTimeout(() => setReviewListing(null), 2500)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Profile Page ──────────────────────────────────────────────────────────
export default function Profile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [balance, setBalance] = useState(Number(user?.balance || 0));
  const [withdrawOpen] = useState(false);
  const [listingsOpen, setListingsOpen] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.wallet.balance()
      .then((data) => setBalance(Number(data.balance || 0)))
      .catch(() => setBalance(Number(user.balance || 0)))
      .finally(() => setBalanceLoading(false));
  }, [user]);

  if (!user) return null;

  const initial = user.username ? user.username.slice(0, 2).toUpperCase() : "U";

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const menuItems = [
    {
      title: t("wishlistLabel"),
      icon: Heart,
      color: "bg-secondary/10 text-secondary",
      href: "/wishlist",
    },
    {
      title: t("purchasesRentals"),
      icon: ShoppingBag,
      color: "bg-amber-100 text-amber-600",
      href: null,
    },
    {
      title: t("reviewsCount"),
      icon: Star,
      count: user.review_count || null,
      color: "bg-yellow-100 text-yellow-600",
      href: null,
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background pb-28">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-4 px-5 flex justify-between items-center border-b border-border/20">
        <h1 className="text-3xl font-black text-foreground">{t("profile")}</h1>
        <button
          onClick={() => setLocation("/settings")}
          className="h-11 w-11 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
        >
          <Settings className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="p-4 pt-6 flex flex-col gap-5">

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] overflow-hidden card-shadow"
        >
          <div className="h-28 pastel-gradient" />
          <div className="flex flex-col items-center -mt-14 pb-6 px-6">
            <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl font-black">
                {initial}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-black mt-3 text-foreground">@{user.username}</h2>
            {user.location && (
              <p className="text-sm text-muted-foreground font-medium mt-0.5">📍 {user.location}</p>
            )}
            <p className="text-sm font-medium text-center mt-2 max-w-[260px] text-muted-foreground leading-relaxed">
              {user.bio || "No bio yet — tap ⚙️ to add one!"}
            </p>

            {/* Stats */}
            <div className="flex w-full justify-around mt-5 pt-5 border-t border-border/30">
              {[
                { label: t("rating"), value: user.rating ? Number(user.rating).toFixed(1) : "New" },
                { label: t("salesLabel"), value: user.sales_count || 0 },
                { label: t("reviewsCount"), value: user.review_count || 0 },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-xl font-black text-foreground">{stat.value}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Edit Profile */}
        <button
          onClick={() => setLocation("/settings")}
          className="w-full h-12 rounded-2xl border-2 border-primary/30 text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {t("editProfileSettings")}
        </button>

        {/* ── Wallet Card ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-gradient-to-br from-primary to-secondary rounded-[2rem] p-5 text-white shadow-[0_8px_24px_rgba(124,58,237,0.3)] overflow-hidden relative"
        >
          {/* Decorative circle */}
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -right-2 bottom-0 h-20 w-20 rounded-full bg-white/5 pointer-events-none" />

          <div className="flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-white/70" />
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest">{t("earnings")} (₾)</p>
              </div>
              {balanceLoading ? (
                <div className="h-10 w-28 bg-white/20 rounded-xl animate-pulse mt-1" />
              ) : (
                <p className="text-4xl font-black tracking-tight mt-1">
                  ₾{balance.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-white/60 font-medium mt-1.5">Total value traded in the community 🏆</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-2xl px-3 py-2">
              <TrendingUp className="h-4 w-4 text-white/80" />
              <span className="text-xs font-bold text-white/80">{user.sales_count || 0} sales</span>
            </div>
          </div>

          {/* Gamified stat footer */}
          <div className="mt-5 flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3">
            <div className="text-center">
              <p className="text-lg font-black text-white">{user.sales_count || 0}</p>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Sales</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-lg font-black text-white">
                {balance > 0 ? `₾${balance.toFixed(0)}` : "₾0"}
              </p>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Earned</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center flex flex-col items-center">
              <p className="text-lg font-black text-white">
                {balance >= 500 ? "🥇" : balance >= 100 ? "🥈" : "🥉"}
              </p>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Rank</p>
            </div>
          </div>

          {balance <= 0 && (
            <p className="text-center text-[10px] text-white/50 mt-2 font-medium">
              Mark your first listing as Sold to start tracking! 🚀
            </p>
          )}
        </motion.div>

        {/* ── My Listings ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-[2rem] card-shadow overflow-hidden"
        >
          {/* Section header */}
          <button
            onClick={() => setListingsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <span className="font-extrabold text-base text-foreground">{t("myListings")}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setLocation("/sell"); }}
                className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-black hover:bg-primary/20 transition-colors"
              >
                + New
              </button>
              <motion.div
                animate={{ rotate: listingsOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </div>
          </button>

          {/* Collapsed/expanded */}
          <AnimatePresence>
            {listingsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <MyListings onSold={(price) => setBalance((b) => b + price)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Other menu items */}
        <div className="flex flex-col gap-3">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 + idx * 0.05 }}
                onClick={() => item.href && setLocation(item.href)}
                className={`flex items-center justify-between p-5 bg-white rounded-3xl card-shadow transition-all ${
                  item.href ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]" : "opacity-60 cursor-default"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-extrabold text-base text-foreground">{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count != null && item.count > 0 && (
                    <span className="bg-primary/10 text-primary text-xs font-black px-3 py-1.5 rounded-full">
                      {item.count}
                    </span>
                  )}
                  {item.href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Log out */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-14 rounded-2xl border-none bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 font-bold text-base card-shadow mt-1"
        >
          <LogOut className="h-5 w-5 mr-2.5" />
          Log Out
        </Button>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {withdrawOpen && (
          <WithdrawModal
            balance={balance}
            onClose={() => setWithdrawOpen(false)}
            onSuccess={(newBalance) => {
              setBalance(newBalance);
              setTimeout(() => setWithdrawOpen(false), 2200);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
