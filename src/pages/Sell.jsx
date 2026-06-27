import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, ChevronLeft, ArrowRight, X, Sparkles, MailCheck, RefreshCw } from "lucide-react";
import CityPicker from "@/components/CityPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const CATEGORIES = [
  { id: "outfit",   emoji: "👗", labelKey: "cat_outfit",   bg: "bg-pink-50",   border: "border-pink-300",   text: "text-pink-600",   activeBg: "bg-pink-100"   },
  { id: "wig",      emoji: "💇", labelKey: "cat_wig",      bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-500", activeBg: "bg-violet-100" },
  { id: "shoes",    emoji: "🥾", labelKey: "cat_shoes",    bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-600",  activeBg: "bg-amber-100"  },
  { id: "prop",     emoji: "⚔️",  labelKey: "cat_prop",     bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-600",   activeBg: "bg-blue-100"   },
  { id: "crafting", emoji: "🧵", labelKey: "cat_crafting", bg: "bg-green-50",  border: "border-green-300",  text: "text-green-600",  activeBg: "bg-green-100"  },
];

const PLACEHOLDER = {
  outfit:   "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80",
  wig:      "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80",
  shoes:    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  prop:     "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
  crafting: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80",
};

const STEP_KEYS = ["stepCategory", "stepDetails", "stepPricing"];

const slide = {
  enter:  (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: "easeOut" } },
  exit:   (dir) => ({ x: dir < 0 ? 50 : -50, opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }),
};

export default function Sell() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  // ── Active listing count (for 3-listing limit) ────────────────────────────
  const [activeListingCount, setActiveListingCount] = useState(null);

  useEffect(() => {
    if (!user?.email_verified) return;
    api.listings.me()
      .then(listings => setActiveListingCount(listings.filter(l => l.is_active).length))
      .catch(() => setActiveListingCount(0));
  }, [user?.id, user?.email_verified]);

  // ── Email verification gate ───────────────────────────────────────────────
  const [resending, setResending]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.auth.resendVerification();
      toast({
        title: t("verificationEmailSent"),
        description: t("checkYourInboxLink"),
      });
    } catch (err) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const me = await api.auth.me();
      setUser(me);
      if (me.email_verified) {
        toast({ title: t("emailVerified"), description: t("youCanNowList") });
      } else {
        toast({ title: t("notYetVerified"), description: t("checkInboxAndRefresh"), variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  if (user && !user.email_verified) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { window.history.length > 1 ? window.history.back() : setLocation("/"); }}
              className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-muted/70 transition-colors"
              data-testid="button-go-back"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-xl font-black text-foreground leading-tight">{t("listAnItem")}</h1>
          </div>
        </div>

        {/* Gate content */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm flex flex-col items-center text-center gap-5"
          >
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="w-9 h-9 text-primary" />
            </div>

            {/* Copy */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] font-black text-foreground leading-tight">
                {t("verifyEmailTitle")}
              </h2>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {t("verifyEmailBody")}
              </p>
              <p className="text-[12.5px] text-muted-foreground/70 font-medium mt-1">
                {t("verifyEmailSentTo")}{" "}
                <span className="font-bold text-foreground">{user?.email}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-3 mt-1">
              <Button
                onClick={handleResend}
                disabled={resending}
                data-testid="button-resend-verification"
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-[14px] shadow-[0_4px_20px_rgba(124,58,237,0.25)] hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {resending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    {t("sending")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <MailCheck className="h-4 w-4" />
                    {t("resendVerificationEmail")}
                  </span>
                )}
              </Button>

              <Button
                onClick={handleRefreshStatus}
                disabled={refreshing}
                variant="outline"
                data-testid="button-refresh-status"
                className="w-full h-12 rounded-2xl border-border/60 font-bold text-[14px] hover:bg-muted/60 transition-colors disabled:opacity-60"
              >
                {refreshing ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("checking")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t("iveVerifiedMyEmail")}
                  </span>
                )}
              </Button>

              <button
                onClick={() => { window.history.length > 1 ? window.history.back() : setLocation("/"); }}
                data-testid="button-go-back-gate"
                className="text-[13.5px] text-muted-foreground font-semibold py-2 hover:text-foreground transition-colors"
              >
                {t("goBack")}
              </button>
            </div>

            {/* Spam note */}
            <p className="text-[12px] text-muted-foreground/60 text-center leading-relaxed px-2">
              {t("verifyEmailSpamNote")}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }
  // ── Listing limit gate ────────────────────────────────────────────────────
  if (user && user.email_verified && activeListingCount >= 3) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { window.history.length > 1 ? window.history.back() : setLocation("/"); }}
              className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-muted/70 transition-colors"
              data-testid="button-go-back-limit"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-xl font-black text-foreground leading-tight">{t("listAnItem")}</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm flex flex-col items-center text-center gap-5"
          >
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-amber-500" />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] font-black text-foreground leading-tight">
                {t("listingLimitTitle")}
              </h2>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {t("listingLimitBody")}
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 mt-1">
              <Button
                onClick={() => setLocation("/profile")}
                data-testid="button-go-to-listings"
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-[14px] shadow-[0_4px_20px_rgba(124,58,237,0.25)] hover:opacity-90 transition-opacity"
              >
                {t("goToMyListings")}
              </Button>
              <button
                onClick={() => { window.history.length > 1 ? window.history.back() : setLocation("/"); }}
                data-testid="button-go-back-limit-link"
                className="text-[13.5px] text-muted-foreground font-semibold py-2 hover:text-foreground transition-colors"
              >
                {t("goBack")}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
  // ── End gate ──────────────────────────────────────────────────────────────

  const detailsSchema = z.object({
    title:       z.string().min(5, t("titleMin")),
    description: z.string().min(10, t("descriptionMin")),
    fandom:      z.string().optional(),
  });

  const [step, setStep]         = useState(0);
  const [direction, setDir]     = useState(1);
  const [category, setCategory] = useState("");
  const [city, setCity]         = useState("");
  const [isForSale, setIsForSale] = useState(true);
  const [isForRent, setIsForRent] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);

  const fileInputRef = useRef(null);

  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(detailsSchema),
    mode: "onBlur",
  });

  const STEP_LABELS = [t("stepCategory"), t("stepDetails"), t("stepPricing")];

  const goNext = async () => {
    if (step === 0 && !category) {
      toast({ title: t("pickCategoryFirst"), variant: "destructive" });
      return;
    }
    if (step === 1) {
      const ok = await trigger(["title", "description"]);
      if (!ok) return;
    }
    setDir(1);
    setStep(s => s + 1);
  };

  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const { urls } = await api.upload.multiple(files);
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (err) {
      toast({ title: t("uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const onPublish = async () => {
    if (!isForSale && !isForRent) {
      toast({ title: t("chooseHowToSell"), description: t("toggleSaleRent"), variant: "destructive" });
      return;
    }
    if (isForSale && (!salePrice || Number(salePrice) <= 0)) {
      toast({ title: t("enterSalePrice"), variant: "destructive" });
      return;
    }
    if (isForRent && (!rentPrice || Number(rentPrice) <= 0)) {
      toast({ title: t("enterRentalPrice"), variant: "destructive" });
      return;
    }

    const { title, description, fandom } = getValues();
    const images = uploadedImages.length > 0 ? uploadedImages : [PLACEHOLDER[category]];

    setSubmitting(true);
    try {
      await api.listings.create({
        title,
        description,
        fandom: fandom || "",
        category,
        location: city || "",
        is_for_sale: isForSale,
        is_for_rent: isForRent,
        price:      isForSale ? Number(salePrice) : null,
        rent_price: isForRent ? Number(rentPrice) : null,
        images,
      });
      setSuccess(true);
      toast({ title: t("listingPublished"), description: t("itemIsLive") });
      window.dispatchEvent(new Event("kosmeo:listingChanged"));
      setTimeout(() => setLocation("/"), 2200);
    } catch (err) {
      toast({ title: t("couldNotSave"), description: err.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-background">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex flex-col items-center bg-white p-10 rounded-[3rem] card-shadow w-full max-w-[340px]"
        >
          <div className="relative">
            <div className="rounded-full bg-green-100 p-6 mb-5">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -top-1 -right-1 text-2xl"
            >✨</motion.div>
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">{t("listed")}</h1>
          <p className="text-muted-foreground font-medium">{t("itemIsLive")}</p>
          <p className="text-xs text-muted-foreground mt-3">{t("takingToFeed")}</p>
        </motion.div>
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.id === category);

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
        <div className="md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={step > 0 ? goBack : () => { window.history.length > 1 ? window.history.back() : setLocation("/"); }}
            className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-muted/70 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground leading-tight">{t("listAnItem")}</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {t("stepLabel")} {step + 1} {t("ofLabel")} {STEP_LABELS.length} · {STEP_LABELS[step]}
            </p>
          </div>
          {/* Hidden on desktop — DesktopNav handles lang switching there */}
          <span className="md:hidden ml-1"><LanguageSwitcher /></span>
        </div>
        <div className="flex gap-1.5">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        </div>
      </div>

      {/* ── Animated step content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="p-5 pb-36 flex flex-col gap-5 md:max-w-2xl md:mx-auto md:w-full"
          >

            {/* ══ STEP 0: Category + Photos ══════════════════════════════ */}
            {step === 0 && (
              <>
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-1">{t("whatAreYouSelling")}</h2>
                  <p className="text-sm text-muted-foreground font-medium">{t("pickCategory")}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border-2 transition-all duration-150 ${
                          active ? `${cat.activeBg} ${cat.border} shadow-md` : "bg-white border-border/40 hover:border-border"
                        } ${cat.id === "crafting" ? "col-span-2" : ""}`}
                      >
                        <span className="text-3xl">{cat.emoji}</span>
                        <span className={`text-sm font-bold ${active ? cat.text : "text-foreground"}`}>{t(cat.labelKey)}</span>
                        {active && (
                          <span className={`text-[10px] font-bold ${cat.text} bg-white/60 px-2 py-0.5 rounded-full`}>
                            {t("selectedMark")}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-3">
                    {t("photos")}
                    <span className="text-muted-foreground font-normal ml-2 text-xs">{t("photosOptional")}</span>
                  </p>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-primary disabled:opacity-60"
                    >
                      {uploading ? (
                        <span className="h-5 w-5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                      ) : (
                        <><Camera className="h-6 w-6" /><span className="text-xs font-bold">{t("addPhoto")}</span></>
                      )}
                    </button>
                    {uploadedImages.map((url, i) => (
                      <div key={i} className="relative h-28 w-28 shrink-0 rounded-2xl overflow-hidden bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center">
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ══ STEP 1: Details ════════════════════════════════════════ */}
            {step === 1 && (
              <>
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-1">{t("tellBuyersMore")}</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {activeCat && <>{activeCat.emoji} {t(activeCat.labelKey)} · </>}{t("goodTitles")}
                  </p>
                </div>

                <div className="bg-white rounded-3xl card-shadow p-5 flex flex-col gap-5">
                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">{t("titleLabel")} <span className="text-red-400">*</span></label>
                    <Input
                      {...register("title")}
                      placeholder="e.g. Sailor Moon Wig – Silver, Long"
                      className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-primary/30"
                    />
                    {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">{t("descriptionLabel")} <span className="text-red-400">*</span></label>
                    <textarea
                      {...register("description")}
                      placeholder="Describe the size, condition, materials, what's included…"
                      rows={4}
                      className="w-full rounded-xl bg-muted border-none p-3.5 text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/50 leading-relaxed transition-shadow"
                    />
                    {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
                  </div>

                  {/* Fandom */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">
                      {t("fandomLabel")}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">{t("optional")}</span>
                    </label>
                    <Input
                      {...register("fandom")}
                      placeholder="e.g. Genshin Impact, Sailor Moon, Demon Slayer…"
                      className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-primary/30"
                    />
                  </div>

                  {/* Location */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">
                      {t("locationLabel")}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">{t("locationHint")}</span>
                    </label>
                    <CityPicker value={city} onChange={setCity} />
                  </div>
                </div>
              </>
            )}

            {/* ══ STEP 2: Pricing ════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-1">{t("setYourPrice")}</h2>
                  <p className="text-sm text-muted-foreground font-medium">{t("pricingBothOptions")}</p>
                </div>

                {/* For Sale */}
                <div className={`bg-white rounded-3xl card-shadow p-5 flex flex-col gap-4 transition-all ${isForSale ? "ring-2 ring-primary/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-foreground">{t("forSale")}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{t("oneTimePurchase")}</p>
                    </div>
                    <button type="button" onClick={() => setIsForSale(v => !v)} className={`w-12 h-6 rounded-full transition-colors relative ${isForSale ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${isForSale ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isForSale && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-primary">₾</span>
                          <input type="number" min="0" step="1" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0" className="w-full h-14 rounded-2xl bg-muted border-none pl-10 pr-4 text-2xl font-black text-foreground outline-none focus:ring-2 focus:ring-primary/25" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* For Rent */}
                <div className={`bg-white rounded-3xl card-shadow p-5 flex flex-col gap-4 transition-all ${isForRent ? "ring-2 ring-secondary/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-foreground">{t("forRent")}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{t("dailyRentalRate")}</p>
                    </div>
                    <button type="button" onClick={() => setIsForRent(v => !v)} className={`w-12 h-6 rounded-full transition-colors relative ${isForRent ? "bg-secondary" : "bg-muted"}`}>
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${isForRent ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isForRent && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-secondary">₾</span>
                          <input type="number" min="0" step="1" value={rentPrice} onChange={e => setRentPrice(e.target.value)} placeholder="0" className="w-full h-14 rounded-2xl bg-muted border-none pl-10 pr-4 text-2xl font-black text-foreground outline-none focus:ring-2 focus:ring-secondary/25" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">{t("perDay")}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Preview card */}
                {(getValues("title") || category) && (
                  <div className="bg-white rounded-3xl card-shadow p-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("preview")}</p>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted shrink-0">
                        <img src={uploadedImages[0] || PLACEHOLDER[category]} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm line-clamp-1">{getValues("title") || t("yourListingTitle")}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {activeCat?.emoji} {activeCat && t(activeCat.labelKey)}
                          {city && <> · 📍 {city}</>}
                        </p>
                        <div className="flex gap-2 mt-1.5">
                          {isForSale && salePrice && <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">₾{salePrice}</span>}
                          {isForRent && rentPrice && <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">₾{rentPrice}{t("perDay")}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Publish */}
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    onClick={onPublish}
                    disabled={submitting}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-base shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    ) : (
                      t("publishListing")
                    )}
                  </Button>
                </motion.div>
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Sticky bottom Next button (steps 0 & 1) ──────────────────── */}
      {step < 2 && (
        <div className="sticky bottom-0 left-0 right-0 z-30 p-5 bg-gradient-to-t from-background via-background/95 to-transparent pt-10">
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              type="button"
              onClick={goNext}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-base shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {step === 1 ? t("nextSetPrice") : t("nextDetails")}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
