import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, ChevronLeft, ArrowRight, X, Sparkles, MailCheck, RefreshCw, Shirt, Waves, Footprints, Shield, Scissors, MapPin, AlertTriangle } from "lucide-react";
import CityPicker from "@/components/CityPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { prepareImageFile, MAX_LISTING_BYTES, MAX_IMAGES_PER_LISTING } from "@/lib/imageUtils";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { validateListingTitle } from "../../shared/titleValidation.js";

const CATEGORIES = [
  { id: "outfit",   icon: Shirt,      labelKey: "cat_outfit",   bg: "bg-pink-50",   border: "border-pink-300",   text: "text-pink-600",   activeBg: "bg-pink-100"   },
  { id: "wig",      icon: Waves,      labelKey: "cat_wig",      bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-500", activeBg: "bg-violet-100" },
  { id: "shoes",    icon: Footprints, labelKey: "cat_shoes",    bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-600",  activeBg: "bg-amber-100"  },
  { id: "prop",     icon: Shield,     labelKey: "cat_prop",     bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-600",   activeBg: "bg-blue-100"   },
  { id: "crafting", icon: Scissors,   labelKey: "cat_crafting", bg: "bg-green-50",  border: "border-green-300",  text: "text-green-600",  activeBg: "bg-green-100"  },
];

const PLACEHOLDER = {
  outfit:   "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80",
  wig:      "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80",
  shoes:    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  prop:     "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
  crafting: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80",
};

const STEP_KEYS = ["stepCategory", "stepDetails", "stepPricing"];

const BRAND_OPTIONS = [
  { id: "dokidoki_ssr",     labelKey: "brand_dokidoki_ssr" },
  { id: "dokidoki_sr",      labelKey: "brand_dokidoki_sr" },
  { id: "delusion",         labelKey: "brand_delusion" },
  { id: "uwowo",            labelKey: "brand_uwowo" },
  { id: "dragon_essence",   labelKey: "brand_dragon_essence" },
  { id: "miccostumes",      labelKey: "brand_miccostumes" },
  { id: "ezcosplay",        labelKey: "brand_ezcosplay" },
  { id: "procosplay",       labelKey: "brand_procosplay" },
  { id: "rolecosplay",      labelKey: "brand_rolecosplay" },
  { id: "selfmade",         labelKey: "brand_selfmade" },
  { id: "other",            labelKey: "brand_other" },
];

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
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
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
  // ADMIN is exempt — the cap bounds beta testers (VIP), not the site's
  // own operator/owner account. Mirrors the same exemption enforced
  // server-side in POST /api/listings.
  if (user && user.email_verified && user.access_status !== "ADMIN" && activeListingCount >= 3) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
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
    title:       z.string().superRefine((val, ctx) => {
      const error = validateListingTitle(val);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("titleMin") });
    }),
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
  const [brand, setBrand] = useState("");

  // ── Rental-specific fields ──────────────────────────────────────────────
  // Only ever shown/used when isForRent is true — see the conditional block
  // in STEP 2 below. Sale/commission listings never read these.
  const [depositAmount, setDepositAmount]   = useState("");
  const [rentalDuration, setRentalDuration] = useState(""); // "1_day" | "3_days" | "1_week" | "custom"
  const [rentalDurationCustom, setRentalDurationCustom] = useState("");
  const [sizeOption, setSizeOption]   = useState(""); // "XS" | "S" | "M" | "L" | "XL" | "custom"
  const [sizeCustom, setSizeCustom]   = useState("");
  const [heightRange, setHeightRange] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [shoeSize, setShoeSize]       = useState("");
  const [includedItems, setIncludedItems] = useState([]); // array of INCLUDED_ITEM_OPTIONS ids
  const [condition, setCondition]     = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState(""); // "pickup" | "shipping" | "both"
  const [damagePolicy, setDamagePolicy] = useState("");

  // Field-level rental errors, mirroring priceErrors/listingTypeError below —
  // persistent inline messages + highlighting, not just a toast.
  const [rentalErrors, setRentalErrors] = useState({});
  const depositRef  = useRef(null);
  const durationRef = useRef(null);
  const deliveryRef = useRef(null);

  const RENTAL_DURATION_OPTIONS = [
    { id: "1_day",  label: "1 day" },
    { id: "3_days", label: "3 days" },
    { id: "1_week", label: "1 week" },
    { id: "custom", label: "Custom" },
  ];
  const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "custom"];
  const INCLUDED_ITEM_OPTIONS = [
    { id: "costume",     label: "Costume" },
    { id: "wig",         label: "Wig" },
    { id: "shoes",       label: "Shoes" },
    { id: "props",       label: "Props" },
    { id: "armor",       label: "Armor" },
    { id: "accessories", label: "Accessories" },
    { id: "other",       label: "Other" },
  ];
  const CONDITION_OPTIONS = [
    { id: "new",       label: "New / Never worn" },
    { id: "like_new",  label: "Like new" },
    { id: "good",      label: "Good condition" },
    { id: "minor_wear", label: "Minor wear" },
  ];
  const DELIVERY_OPTIONS = [
    { id: "pickup",   label: "Pickup only" },
    { id: "shipping", label: "Shipping available" },
    { id: "both",     label: "Both" },
  ];

  const toggleIncludedItem = (id) => {
    setIncludedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  // ── Image upload state ─────────────────────────────────────────────────
  // `uploadedImages` holds every selected image (id/previewUrl/url/status),
  // regardless of where it is in its lifecycle. `uploadingImages` and
  // `uploadErrors` are derived/tracked explicitly below so the Next button's
  // disabled state, its label, and the step-advance guard all read from the
  // same source of truth instead of each re-deriving it ad hoc.
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]); // string messages from the most recent batch
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false); // true while a handleFileSelect batch is in flight
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);

  // Images currently mid-upload — the single source of truth for "is it safe
  // to advance past step 0 yet". Anything with status "uploading" still has
  // url === null, so letting the user proceed would carry a null image URL
  // into the pricing preview and, if not caught again at publish, into the
  // final listing payload.
  const uploadingImages = uploadedImages.filter((img) => img.status === "uploading");
  const isUploading = uploadingImages.length > 0;

  // Only /api/media/ URLs are durable listing images (written to R2).
  // /uploads/ paths are ephemeral local-disk fallbacks that don't survive
  // container restarts, so they are never valid for a published listing.
  const isValidMediaUrl = (url) =>
    typeof url === "string" && url.startsWith("/api/media/");

  // True when every selected image has finished uploading AND resolved to a
  // durable /api/media/ URL. Used to gate step-0 → step-1 navigation.
  const imagesReady =
    uploadedImages.length > 0 &&
    !isUploading &&
    uploadedImages.every((img) => img.status === "done" && isValidMediaUrl(img.url));

  // True when at least one image finished uploading but ended up with an
  // unusable URL (e.g. storage was unavailable for that request). Checked
  // separately from imagesReady so the user gets the right message.
  const hasBrokenImages = uploadedImages.some(
    (img) => img.status === "done" && !isValidMediaUrl(img.url)
  );

  // ── Pricing / listing-type field-level validation ─────────────────────
  // Mirrors the toast (which can be missed/dismissed) with a persistent
  // inline message + highlighted field, and scrolls/focuses the first
  // invalid field so "Publish did nothing" never happens silently.
  const [priceErrors, setPriceErrors] = useState({ sale: "", rent: "" });
  const [listingTypeError, setListingTypeError] = useState(false);
  const salePriceRef = useRef(null);
  const rentPriceRef = useRef(null);
  const listingTypeRef = useRef(null);

  const validatePriceValue = (raw) => {
    if (raw === "" || raw === null || raw === undefined) {
      return "Please enter a price amount.";
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) {
      return "Please enter a valid price.";
    }
    return "";
  };

  const scrollToAndFocus = (ref) => {
    ref?.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    ref?.current?.focus?.();
  };

  const fileInputRef = useRef(null);
  // Guards against re-entrant goNext() calls — e.g. a user clicking Next
  // several times in the same tick, before the disabled-button re-render
  // has actually landed. Without this, two rapid calls can both read the
  // same `step` from closure and both call setStep(s => s + 1), skipping a
  // step entirely.
  const navigatingRef = useRef(false);

  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(detailsSchema),
    mode: "onBlur",
  });

  const STEP_LABELS = [t("stepCategory"), t("stepDetails"), t("stepPricing")];

  const goNext = async () => {
    // Re-entrancy guard: ignore this call entirely if a previous call is
    // still resolving (covers rapid repeated clicks and the async step-1
    // validation branch below).
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      if (step === 0 && !category) {
        toast({ title: t("pickCategoryFirst"), variant: "destructive" });
        return;
      }
      if (step === 0 && uploadedImages.length === 0) {
        setImageError(true);
        return;
      }
      // Block navigating forward while any photo is still mid-upload, or if
      // one finished without a valid final URL — its `url` would still be
      // null/invalid at this point, so the pricing-step preview (and, if
      // this guard were ever bypassed, the final publish payload) would have
      // nothing but a possibly-already-revoked blob to fall back on. The
      // Next button is also disabled for the same condition below, so this
      // is a defense-in-depth check, not the only place this is enforced.
      if (step === 0 && hasBrokenImages) {
        toast({ title: "This photo could not be saved. Please upload it again.", variant: "destructive" });
        return;
      }
      if (step === 0 && !imagesReady) {
        toast({ title: "Please wait for photos to finish uploading.", variant: "destructive" });
        return;
      }
      if (step === 1) {
        const ok = await trigger(["title", "description"]);
        if (!ok) return;
      }
      setDir(1);
      setStep(s => s + 1);
    } finally {
      navigatingRef.current = false;
    }
  };

  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  const handleFileSelect = async (e) => {
    let files = Array.from(e.target.files || []);
    // Reset the input value so selecting the exact same file again still
    // fires onChange (the browser won't re-fire change on an unchanged value).
    e.target.value = "";
    if (!files.length) return;

    // Cap the total at MAX_IMAGES_PER_LISTING — silently drop the overflow
    // and tell the user why, rather than uploading images that the backend
    // (createListingSchema's images.max(5)) would reject at publish time.
    const remainingSlots = MAX_IMAGES_PER_LISTING - uploadedImages.length;
    if (remainingSlots <= 0) {
      toast({ title: t("maxPhotosReached", { count: MAX_IMAGES_PER_LISTING }), variant: "destructive" });
      return;
    }
    if (files.length > remainingSlots) {
      toast({ title: t("maxPhotosReached", { count: MAX_IMAGES_PER_LISTING }), variant: "destructive" });
      files = files.slice(0, remainingSlots);
    }

    // Show an instant local preview (URL.createObjectURL) for each picked
    // file before the network upload even starts, so the UI never looks
    // unresponsive while the upload is in flight or if it's slow.
    //
    // Each pending item gets a stable `id` (via crypto.randomUUID) so that
    // the success/error handlers can match items by identity rather than by
    // object-reference. Reference-based matching (indexOf/includes) breaks
    // when React's reconciliation produces a new `prev` array whose items are
    // no longer the exact same references as those in `pending`, causing every
    // match to return -1 and leaving thumbnails with a revoked blob URL and
    // no real URL — i.e. a blank image that disappears after upload.
    const pending = files.map(file => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      url: null,
      status: "uploading",
    }));
    setUploadedImages(prev => [...prev, ...pending]);
    setImageError(false);
    setUploadErrors([]); // clear stale errors from a previous batch
    setUploading(true);

    try {
      // Convert HEIC/HEIF (default iPhone photo format) to JPEG before
      // upload — browsers can't render HEIC in an <img> tag, so skipping
      // this step produces a "successful" upload with a broken thumbnail.
      const prepared = await Promise.all(
        files.map((f) => prepareImageFile(f, { maxBytes: MAX_LISTING_BYTES }))
      );
      const { urls } = await api.upload.multiple(prepared);
      // Important: do NOT call URL.revokeObjectURL inside a state updater.
      // React Strict Mode invokes state updaters twice — the first invocation
      // revokes the blob URL, then React discards that result and runs the
      // updater a second time with the original state. If React commits a
      // render between those two invocations (possible in concurrent mode),
      // the <img> src would briefly point at a revoked blob, producing a
      // broken image. Keep the blob alive here; the onLoad handler on each
      // <img> revokes it once the server URL has confirmed it loaded.
      setUploadedImages(prev => prev.map(img => {
        const idx = pending.findIndex(p => p.id === img.id);
        if (idx === -1) return img;
        return { ...img, url: urls[idx], status: "done" };
      }));
    } catch (err) {
      // Drop the failed placeholders and free their object URLs so a failed
      // upload doesn't leave a permanently-spinning/broken thumbnail behind.
      setUploadedImages(prev => prev.filter(img => !pending.some(p => p.id === img.id)));
      pending.forEach(p => URL.revokeObjectURL(p.previewUrl));
      setUploadErrors(prev => [...prev, err.message || t("uploadFailed")]);
      toast({ title: t("uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => {
    // Pull the item out first so we can revoke its blob URL outside the
    // state updater (revoking inside updaters is unsafe: Strict Mode calls
    // them twice, which means the blob gets revoked on the first invocation
    // and the component may briefly render a broken src before the second
    // invocation produces the final committed state).
    setUploadedImages(prev => {
      const removed = prev[idx];
      // Schedule revocation after this synchronous block; by then React has
      // committed the state and the element is unmounted / src has changed.
      if (removed?.previewUrl) {
        setTimeout(() => URL.revokeObjectURL(removed.previewUrl), 0);
      }
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setImageError(true);
      return next;
    });
  };

  const onPublish = async () => {
    // Guard: images are required — this should normally be caught on step 0,
    // but defend here too so the backend rule is never silently bypassed.
    if (uploadedImages.length === 0) {
      setImageError(true);
      toast({ title: "Please upload at least one image.", variant: "destructive" });
      return;
    }
    // Reset stale field errors before revalidating this attempt.
    setListingTypeError(false);
    setPriceErrors({ sale: "", rent: "" });
    setRentalErrors({});

    if (!isForSale && !isForRent) {
      setListingTypeError(true);
      toast({ title: "Please select a listing type.", variant: "destructive" });
      scrollToAndFocus(listingTypeRef);
      return;
    }

    const saleErr = isForSale ? validatePriceValue(salePrice) : "";
    const rentErr = isForRent ? validatePriceValue(rentPrice) : "";
    if (saleErr || rentErr) {
      setPriceErrors({ sale: saleErr, rent: rentErr });
      toast({ title: saleErr || rentErr, variant: "destructive" });
      scrollToAndFocus(saleErr ? salePriceRef : rentPriceRef);
      return;
    }

    // Rental-only required fields. Sale/commission listings (isForRent ===
    // false) never hit this branch, so their flow is completely unaffected.
    if (isForRent) {
      const rErrors = {};
      const depositErr = validatePriceValue(depositAmount);
      if (depositErr) {
        rErrors.deposit = depositErr === "Please enter a price amount."
          ? "Please enter a refundable security deposit amount."
          : "Please enter a valid deposit amount.";
      }
      if (!rentalDuration) {
        rErrors.duration = "Please select a rental duration.";
      } else if (rentalDuration === "custom" && !rentalDurationCustom.trim()) {
        rErrors.duration = "Please specify the custom rental duration.";
      }
      if (!deliveryMethod) {
        rErrors.delivery = "Please select a pickup/shipping option.";
      }
      if (Object.keys(rErrors).length > 0) {
        setRentalErrors(rErrors);
        toast({ title: rErrors.deposit || rErrors.duration || rErrors.delivery, variant: "destructive" });
        scrollToAndFocus(rErrors.deposit ? depositRef : rErrors.duration ? durationRef : deliveryRef);
        return;
      }
    }

    // Broken images are caught at step 0 before the user can advance, so
    // hasBrokenImages here is a defense-in-depth check only.
    if (hasBrokenImages) {
      toast({ title: "This photo could not be saved. Please upload it again.", variant: "destructive" });
      return;
    }
    if (!imagesReady) {
      toast({ title: "Please wait for photos to finish uploading.", variant: "destructive" });
      return;
    }

    const { title, description, fandom } = getValues();

    // Every image that reached this point passed isValidMediaUrl() at the
    // step-0 gate, so all done images have durable /api/media/ URLs.
    const images = uploadedImages
      .filter(img => img.status === "done")
      .map(img => img.url);
    const finalSize = isForRent ? (sizeOption === "custom" ? sizeCustom : sizeOption) : "";

    setSubmitting(true);
    try {
      await api.listings.create({
        title,
        description,
        fandom: fandom || "",
        brand: brand || "",
        category,
        location: city || "",
        is_for_sale: isForSale,
        is_for_rent: isForRent,
        price:      isForSale ? Number(salePrice) : null,
        rent_price: isForRent ? Number(rentPrice) : null,
        size:       finalSize,
        condition:  isForRent ? condition : "",
        // Rental-specific fields — the backend also ignores/nulls these when
        // is_for_rent is false, this just avoids sending stale values.
        deposit_amount:         isForRent ? Number(depositAmount) : null,
        rental_duration:        isForRent ? rentalDuration : null,
        rental_duration_custom: isForRent && rentalDuration === "custom" ? rentalDurationCustom : "",
        height_range:           isForRent ? heightRange : "",
        measurements:           isForRent ? measurements : "",
        shoe_size:              isForRent ? shoeSize : "",
        included_items:         isForRent ? includedItems : [],
        care_instructions:      isForRent ? careInstructions : "",
        delivery_method:        isForRent ? deliveryMethod : null,
        damage_policy:          isForRent ? damagePolicy : "",
        images,
      });
      setSuccess(true);
      toast({ title: t("listingPublished"), description: t("itemIsLive") });
      window.dispatchEvent(new Event("kosmeo:listingChanged"));
      setTimeout(() => setLocation("/"), 2200);
    } catch (err) {
      if (err.message === "listing_limit_reached") {
        toast({ title: t("listingLimitTitle"), description: t("listingLimitBody"), variant: "destructive" });
      } else {
        toast({ title: t("couldNotSave"), description: err.message, variant: "destructive" });
      }
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
          className="flex flex-col items-center bg-card p-10 rounded-[3rem] card-shadow w-full max-w-[340px]"
        >
          <div className="relative">
            <div className="rounded-full bg-green-100 p-6 mb-5">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
            </motion.div>
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
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
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
                          active ? `${cat.activeBg} ${cat.border} shadow-md` : "bg-card border-border/40 hover:border-border"
                        } ${cat.id === "crafting" ? "col-span-2" : ""}`}
                      >
                        <cat.icon className="h-7 w-7" />
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
                    <span className="text-error ml-1">*</span>
                    <span className="text-muted-foreground font-normal ml-2 text-xs">
                      {uploadedImages.length}/{MAX_IMAGES_PER_LISTING}
                    </span>
                    {imageError && (
                      <span className="text-error font-normal ml-2 text-xs">
                        Please upload at least one image.
                      </span>
                    )}
                    {isUploading && (
                      <span className="text-primary font-normal ml-2 text-xs inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        Uploading images...
                      </span>
                    )}
                  </p>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {uploadedImages.length < MAX_IMAGES_PER_LISTING && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors disabled:opacity-60 ${
                          imageError
                            ? "border-error/50 bg-error/5 text-error hover:bg-error/10"
                            : "border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
                        }`}
                      >
                        {uploading ? (
                          <span className={`h-5 w-5 rounded-full border-2 animate-spin ${imageError ? "border-error/40 border-t-error" : "border-primary/40 border-t-primary"}`} />
                        ) : (
                          <><Camera className="h-6 w-6" /><span className="text-xs font-bold">{t("addPhoto")}</span></>
                        )}
                      </button>
                    )}
                    {uploadedImages.map((img, i) => (
                      <div key={img.id ?? i} className="relative h-28 w-28 shrink-0 rounded-2xl overflow-hidden bg-muted">
                        <img
                          src={img.url || img.previewUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onLoad={(e) => {
                            // Server URL loaded successfully — safe to release the blob now.
                            // Only revoke after the server URL has confirmed it loaded
                            // (not when the initial blob preview fires onLoad).
                            if (img.previewUrl && !e.target.src.startsWith("blob:")) {
                              URL.revokeObjectURL(img.previewUrl);
                            }
                          }}
                          onError={(e) => {
                            // Server URL failed (e.g. autoscale where the file is on a
                            // different instance, or ephemeral disk). Fall back to the
                            // local blob preview which is still alive in this session.
                            if (img.previewUrl && e.target.src !== img.previewUrl) {
                              console.warn("[sell] server URL failed, falling back to blob preview:", e.target.src);
                              e.target.src = img.previewUrl;
                            } else {
                              console.error("[sell] image failed to load:", e.target.src);
                            }
                          }}
                        />
                        {img.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          </div>
                        )}
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center">
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {uploadErrors.length > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-error/30 bg-error/5 p-3 text-error">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold leading-relaxed">{uploadErrors[uploadErrors.length - 1]}</p>
                    </div>
                  )}

                  {/* Real Photos Only warning */}
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-xs font-semibold leading-relaxed">
                      <span className="font-black">{t("realPhotosWarningTitle")}:</span> {t("realPhotosWarningBody")}
                    </p>
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
                    {activeCat && <>{t(activeCat.labelKey)} · </>}{t("goodTitles")}
                  </p>
                </div>

                <div className="bg-card rounded-3xl card-shadow p-5 flex flex-col gap-5">
                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">{t("titleLabel")} <span className="text-error">*</span></label>
                    <Input
                      {...register("title")}
                      aria-invalid={!!errors.title}
                      placeholder="e.g. Sailor Moon Wig – Silver, Long"
                      className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-primary/30"
                    />
                    {errors.title && <p className="text-xs text-error font-medium">{errors.title.message}</p>}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">{t("descriptionLabel")} <span className="text-error">*</span></label>
                    <textarea
                      {...register("description")}
                      aria-invalid={!!errors.description}
                      placeholder="Describe the size, condition, materials, what's included…"
                      rows={4}
                      className="w-full rounded-xl bg-muted border-none p-3.5 text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/50 leading-relaxed transition-shadow"
                    />
                    {errors.description && <p className="text-xs text-error font-medium">{errors.description.message}</p>}
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

                  {/* Brand / Maker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">
                      {t("brandLabel")}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">{t("optional")}</span>
                    </label>
                    <select
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      className="bg-muted border-none h-12 rounded-xl text-sm font-medium px-3.5 outline-none focus:ring-2 focus:ring-primary/25 text-foreground"
                    >
                      <option value="">{t("brandPlaceholder")}</option>
                      {BRAND_OPTIONS.map(b => (
                        <option key={b.id} value={b.id}>{t(b.labelKey)}</option>
                      ))}
                    </select>
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

                {/* Listing type selection error (Sell / Rent) */}
                {listingTypeError && (
                  <div className="flex items-start gap-2 rounded-2xl border border-error/30 bg-error/5 p-3 text-error">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed">Please select a listing type.</p>
                  </div>
                )}

                {/* For Sale */}
                <div
                  ref={listingTypeRef}
                  tabIndex={-1}
                  className={`bg-card rounded-3xl card-shadow p-5 flex flex-col gap-4 transition-all outline-none ${
                    isForSale ? "ring-2 ring-primary/30" : ""
                  } ${listingTypeError ? "card-error" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-foreground">{t("forSale")}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{t("oneTimePurchase")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIsForSale(v => !v); setListingTypeError(false); }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isForSale ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${isForSale ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isForSale && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-primary">₾</span>
                          <input
                            ref={salePriceRef}
                            type="number"
                            min="0"
                            step="1"
                            value={salePrice}
                            onChange={e => { setSalePrice(e.target.value); if (priceErrors.sale) setPriceErrors(p => ({ ...p, sale: "" })); }}
                            placeholder="0"
                            aria-invalid={!!priceErrors.sale}
                            className="w-full h-14 rounded-2xl bg-muted border-none pl-10 pr-4 text-2xl font-black text-foreground outline-none focus:ring-2 focus:ring-primary/25 transition-shadow"
                          />
                        </div>
                        {priceErrors.sale && (
                          <p className="text-xs text-error font-semibold mt-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {priceErrors.sale}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* For Rent */}
                <div
                  className={`bg-card rounded-3xl card-shadow p-5 flex flex-col gap-4 transition-all ${
                    isForRent ? "ring-2 ring-secondary/30" : ""
                  } ${listingTypeError ? "card-error" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-foreground">{t("forRent")}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{t("dailyRentalRate")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIsForRent(v => !v); setListingTypeError(false); }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isForRent ? "bg-secondary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${isForRent ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isForRent && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-secondary">₾</span>
                          <input
                            ref={rentPriceRef}
                            type="number"
                            min="0"
                            step="1"
                            value={rentPrice}
                            onChange={e => { setRentPrice(e.target.value); if (priceErrors.rent) setPriceErrors(p => ({ ...p, rent: "" })); }}
                            placeholder="0"
                            aria-invalid={!!priceErrors.rent}
                            className="w-full h-14 rounded-2xl bg-muted border-none pl-10 pr-4 text-2xl font-black text-foreground outline-none focus:ring-2 focus:ring-secondary/25 transition-shadow"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">{t("perDay")}</span>
                        </div>
                        {priceErrors.rent && (
                          <p className="text-xs text-error font-semibold mt-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {priceErrors.rent}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ══ Rental-specific details ══════════════════════════════
                    Only rendered when isForRent — sale/commission listings
                    never see or submit any of these fields. ══════════════ */}
                <AnimatePresence>
                  {isForRent && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-4">

                        {/* Security deposit */}
                        <div
                          ref={depositRef}
                          tabIndex={-1}
                          className={`bg-card rounded-3xl card-shadow p-5 flex flex-col gap-2 outline-none ${
                            rentalErrors.deposit ? "card-error" : ""
                          }`}
                        >
                          <label className="text-sm font-bold text-foreground">
                            Refundable Security Deposit <span className="text-error">*</span>
                          </label>
                          <p className="text-xs text-muted-foreground font-medium -mt-1">
                            Protects you if the costume/props are damaged, lost, or returned in bad condition.
                          </p>
                          <div className="relative mt-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-secondary">₾</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={depositAmount}
                              onChange={e => { setDepositAmount(e.target.value); if (rentalErrors.deposit) setRentalErrors(p => ({ ...p, deposit: "" })); }}
                              placeholder="e.g. 150"
                              aria-invalid={!!rentalErrors.deposit}
                              className="w-full h-14 rounded-2xl bg-muted border-none pl-10 pr-4 text-2xl font-black text-foreground outline-none focus:ring-2 focus:ring-secondary/25 transition-shadow"
                            />
                          </div>
                          {rentalErrors.deposit && (
                            <p className="text-xs text-error font-semibold mt-1 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {rentalErrors.deposit}
                            </p>
                          )}
                        </div>

                        {/* Rental duration */}
                        <div
                          ref={durationRef}
                          tabIndex={-1}
                          className={`bg-card rounded-3xl card-shadow p-5 flex flex-col gap-3 outline-none ${
                            rentalErrors.duration ? "card-error" : ""
                          }`}
                        >
                          <label className="text-sm font-bold text-foreground">
                            Rental Duration <span className="text-error">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {RENTAL_DURATION_OPTIONS.map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => { setRentalDuration(opt.id); if (rentalErrors.duration) setRentalErrors(p => ({ ...p, duration: "" })); }}
                                className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                                  rentalDuration === opt.id
                                    ? "bg-secondary/10 border-secondary text-secondary"
                                    : "bg-muted border-transparent text-foreground hover:border-border"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {rentalDuration === "custom" && (
                            <Input
                              value={rentalDurationCustom}
                              onChange={e => { setRentalDurationCustom(e.target.value); if (rentalErrors.duration) setRentalErrors(p => ({ ...p, duration: "" })); }}
                              placeholder="e.g. 10 days, 2 weeks"
                              className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-secondary/30"
                            />
                          )}
                          {rentalErrors.duration && (
                            <p className="text-xs text-error font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {rentalErrors.duration}
                            </p>
                          )}
                        </div>

                        {/* Size information */}
                        <div className="bg-card rounded-3xl card-shadow p-5 flex flex-col gap-4">
                          <p className="text-sm font-bold text-foreground">Size Information</p>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Size</label>
                            <div className="flex flex-wrap gap-2">
                              {SIZE_OPTIONS.map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setSizeOption(opt)}
                                  className={`h-10 px-4 rounded-xl text-sm font-bold border-2 transition-colors ${
                                    sizeOption === opt
                                      ? "bg-secondary/10 border-secondary text-secondary"
                                      : "bg-muted border-transparent text-foreground hover:border-border"
                                  }`}
                                >
                                  {opt === "custom" ? "Custom" : opt}
                                </button>
                              ))}
                            </div>
                            {sizeOption === "custom" && (
                              <Input
                                value={sizeCustom}
                                onChange={e => setSizeCustom(e.target.value)}
                                placeholder="e.g. EU 38, Kids L"
                                className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-secondary/30 mt-1"
                              />
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Height range</label>
                            <Input
                              value={heightRange}
                              onChange={e => setHeightRange(e.target.value)}
                              placeholder="e.g. 160–170 cm"
                              className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-secondary/30"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              Measurements <span className="text-muted-foreground/70 font-normal normal-case">(optional)</span>
                            </label>
                            <Input
                              value={measurements}
                              onChange={e => setMeasurements(e.target.value)}
                              placeholder="e.g. Bust 86cm, Waist 66cm, Hips 90cm"
                              className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-secondary/30"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              Shoe size <span className="text-muted-foreground/70 font-normal normal-case">(optional)</span>
                            </label>
                            <Input
                              value={shoeSize}
                              onChange={e => setShoeSize(e.target.value)}
                              placeholder="e.g. EU 39"
                              className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-secondary/30"
                            />
                          </div>
                        </div>

                        {/* Included items */}
                        <div className="bg-card rounded-3xl card-shadow p-5 flex flex-col gap-3">
                          <p className="text-sm font-bold text-foreground">Included Items</p>
                          <div className="grid grid-cols-2 gap-2">
                            {INCLUDED_ITEM_OPTIONS.map(opt => {
                              const checked = includedItems.includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => toggleIncludedItem(opt.id)}
                                  className={`h-11 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-colors ${
                                    checked
                                      ? "bg-secondary/10 border-secondary text-secondary"
                                      : "bg-muted border-transparent text-foreground hover:border-border"
                                  }`}
                                >
                                  <span className={`h-4 w-4 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? "bg-secondary border-secondary" : "border-muted-foreground/30"}`}>
                                    {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                                  </span>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Condition */}
                        <div className="bg-card rounded-3xl card-shadow p-5 flex flex-col gap-2">
                          <label className="text-sm font-bold text-foreground">Condition</label>
                          <select
                            value={condition}
                            onChange={e => setCondition(e.target.value)}
                            className="bg-muted border-none h-12 rounded-xl text-sm font-medium px-3.5 outline-none focus:ring-2 focus:ring-secondary/25 text-foreground"
                          >
                            <option value="">Select condition…</option>
                            {CONDITION_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Care / return instructions */}
                        <div className="bg-card rounded-3xl card-shadow p-5 flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-foreground">
                            Care instructions / rental rules
                            <span className="text-muted-foreground font-normal ml-2 text-xs">optional</span>
                          </label>
                          <textarea
                            value={careInstructions}
                            onChange={e => setCareInstructions(e.target.value)}
                            placeholder="e.g. Hand wash wig only, return in provided garment bag…"
                            rows={3}
                            className="w-full rounded-xl bg-muted border-none p-3.5 text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-secondary/25 placeholder:text-muted-foreground/50 leading-relaxed"
                          />
                        </div>

                        {/* Location / delivery */}
                        <div
                          ref={deliveryRef}
                          tabIndex={-1}
                          className={`bg-card rounded-3xl card-shadow p-5 flex flex-col gap-3 outline-none ${
                            rentalErrors.delivery ? "card-error" : ""
                          }`}
                        >
                          <label className="text-sm font-bold text-foreground">
                            Pickup / Delivery <span className="text-error">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {DELIVERY_OPTIONS.map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => { setDeliveryMethod(opt.id); if (rentalErrors.delivery) setRentalErrors(p => ({ ...p, delivery: "" })); }}
                                className={`h-11 rounded-xl text-xs font-bold border-2 px-1 transition-colors ${
                                  deliveryMethod === opt.id
                                    ? "bg-secondary/10 border-secondary text-secondary"
                                    : "bg-muted border-transparent text-foreground hover:border-border"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {rentalErrors.delivery && (
                            <p className="text-xs text-error font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {rentalErrors.delivery}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-medium">
                            City/location is set on the Details step ({city ? city : "not set"}).
                          </p>
                        </div>

                        {/* Damage policy */}
                        <div className="bg-card rounded-3xl card-shadow p-5 flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-foreground">
                            Damage policy
                            <span className="text-muted-foreground font-normal ml-2 text-xs">optional</span>
                          </label>
                          <textarea
                            value={damagePolicy}
                            onChange={e => setDamagePolicy(e.target.value)}
                            placeholder="e.g. Deposit may be partially withheld for damaged parts or missing accessories."
                            rows={3}
                            className="w-full rounded-xl bg-muted border-none p-3.5 text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-secondary/25 placeholder:text-muted-foreground/50 leading-relaxed"
                          />
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preview card */}
                {(getValues("title") || category) && (
                  <div className="bg-card rounded-3xl card-shadow p-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("preview")}</p>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted shrink-0">
                        <img
                          key={uploadedImages[0]?.id ?? "placeholder"}
                          src={uploadedImages[0]?.url || uploadedImages[0]?.previewUrl || PLACEHOLDER[category]}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Mirror the step-0 thumbnail's resilience: if the
                            // server URL fails, fall back to the still-alive
                            // local blob preview instead of showing nothing.
                            const fallback = uploadedImages[0]?.previewUrl;
                            if (fallback && e.target.src !== fallback) {
                              console.warn("[sell] preview server URL failed, falling back to blob preview:", e.target.src);
                              e.target.src = fallback;
                            } else {
                              console.error("[sell] preview image failed to load:", e.target.src);
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm line-clamp-1">{getValues("title") || t("yourListingTitle")}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1 flex-wrap">
                          {activeCat && t(activeCat.labelKey)}
                          {city && <><MapPin className="h-3 w-3 inline" />{city}</>}
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
              // Disabled at the button level (not just inside goNext) so a
              // real click while images are uploading never even fires the
              // handler — the browser's native `disabled` attribute blocks
              // it outright, independent of the navigatingRef guard.
              disabled={step === 0 && isUploading}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-base shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {step === 0 && isUploading ? (
                <>
                  <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Uploading images...
                </>
              ) : (
                <>
                  {step === 1 ? t("nextSetPrice") : t("nextDetails")}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
