import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, ArrowLeft, ArrowRight, X, Sparkles, MapPin, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

// ── City data ──────────────────────────────────────────────────────────────────
const CITIES = [
  { key: "city_tbilisi", en: "Tbilisi",  flag: "🏙️" },
  { key: "city_batumi",  en: "Batumi",   flag: "🌊" },
  { key: "city_kutaisi", en: "Kutaisi",  flag: "🏛️" },
  { key: "city_rustavi", en: "Rustavi",  flag: "🏗️" },
  { key: "city_zugdidi", en: "Zugdidi",  flag: "🌿" },
  { key: "city_poti",    en: "Poti",     flag: "⚓" },
  { key: "city_gori",    en: "Gori",     flag: "🏔️" },
];

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "outfit",   emoji: "👗", label: "Full Outfit",   bg: "bg-pink-50",   border: "border-pink-300",   text: "text-pink-600",   activeBg: "bg-pink-100"   },
  { id: "wig",      emoji: "💇", label: "Wig",           bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-600", activeBg: "bg-purple-100" },
  { id: "shoes",    emoji: "🥾", label: "Shoes",         bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-600",  activeBg: "bg-amber-100"  },
  { id: "prop",     emoji: "⚔️",  label: "Prop",          bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-600",   activeBg: "bg-blue-100"   },
  { id: "crafting", emoji: "🧵", label: "Crafting/DIY",  bg: "bg-green-50",  border: "border-green-300",  text: "text-green-600",  activeBg: "bg-green-100"  },
];

const PLACEHOLDER = {
  outfit:   "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80",
  wig:      "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80",
  shoes:    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  prop:     "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
  crafting: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80",
};

const STEPS = ["Category", "Details", "Pricing"];

const detailsSchema = z.object({
  title:       z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Add a bit more detail for buyers"),
  fandom:      z.string().optional(),
});

const slide = {
  enter:  (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: "easeOut" } },
  exit:   (dir) => ({ x: dir < 0 ? 50 : -50, opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }),
};

// ── City Picker ────────────────────────────────────────────────────────────────
function CityPicker({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = CITIES.filter(c =>
    t(c.key).toLowerCase().includes(query.toLowerCase()) ||
    c.en.toLowerCase().includes(query.toLowerCase())
  );

  const selected = CITIES.find(c => c.en === value);

  function pick(city) {
    onChange(city.en);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full h-12 rounded-xl bg-muted border-none px-4 flex items-center justify-between text-sm font-medium transition-all ${
          open ? "ring-2 ring-primary/30" : ""
        }`}
      >
        <span className="flex items-center gap-2.5">
          <MapPin className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground/50"}`} />
          {selected ? (
            <span className="text-foreground font-bold">
              {selected.flag} {t(selected.key)}
            </span>
          ) : (
            <span className="text-muted-foreground/60">Select your city…</span>
          )}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-border/30 overflow-hidden"
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search cities…"
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-muted text-sm font-medium outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* City list */}
            <div className="max-h-52 overflow-y-auto no-scrollbar pb-2">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4 font-medium">No cities found</p>
              ) : (
                filtered.map(city => {
                  const isActive = city.en === value;
                  return (
                    <button
                      key={city.key}
                      type="button"
                      onClick={() => pick(city)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? "bg-primary/8 text-primary"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <span className="text-lg leading-none">{city.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                          {t(city.key)}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">{city.en}</p>
                      </div>
                      {isActive && (
                        <span className="text-xs font-black text-primary">✓</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Sell page ─────────────────────────────────────────────────────────────
export default function Sell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const goNext = async () => {
    if (step === 0 && !category) {
      toast({ title: "Pick a category first!", variant: "destructive" });
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
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const onPublish = async () => {
    if (!isForSale && !isForRent) {
      toast({ title: "Choose how to sell", description: "Toggle For Sale and/or For Rent.", variant: "destructive" });
      return;
    }
    if (isForSale && (!salePrice || Number(salePrice) <= 0)) {
      toast({ title: "Enter a sale price", variant: "destructive" });
      return;
    }
    if (isForRent && (!rentPrice || Number(rentPrice) <= 0)) {
      toast({ title: "Enter a rental price", variant: "destructive" });
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
      toast({ title: "Listing published! 🎉", description: "Your item is now live." });
      setTimeout(() => setLocation("/"), 2200);
    } catch (err) {
      toast({ title: "Could not publish", description: err.message, variant: "destructive" });
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
          <h1 className="text-2xl font-black text-foreground mb-2">Listed!</h1>
          <p className="text-muted-foreground font-medium">Your item is live in the CosMeo marketplace.</p>
          <p className="text-xs text-muted-foreground mt-3">Taking you to the feed…</p>
        </motion.div>
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.id === category);

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-11 pb-4 px-5 border-b border-border/20">
        <div className="flex items-center gap-3 mb-4">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-muted/70 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground leading-tight">List an Item</h1>
            <p className="text-xs text-muted-foreground font-medium">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
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
            className="p-5 pb-28 flex flex-col gap-5"
          >

            {/* ══ STEP 0: Category + Photos ══════════════════════════════ */}
            {step === 0 && (
              <>
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-1">What are you selling?</h2>
                  <p className="text-sm text-muted-foreground font-medium">Pick the category that best fits your item.</p>
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
                        <span className={`text-sm font-bold ${active ? cat.text : "text-foreground"}`}>{cat.label}</span>
                        {active && (
                          <span className={`text-[10px] font-bold ${cat.text} bg-white/60 px-2 py-0.5 rounded-full`}>
                            Selected ✓
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-3">
                    Photos
                    <span className="text-muted-foreground font-normal ml-2 text-xs">optional — we'll use a placeholder if skipped</span>
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
                        <><Camera className="h-6 w-6" /><span className="text-xs font-bold">Add Photo</span></>
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
                  <h2 className="text-2xl font-black text-foreground mb-1">Tell buyers more</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {activeCat && <>{activeCat.emoji} {activeCat.label} · </>}Good titles get more views!
                  </p>
                </div>

                <div className="bg-white rounded-3xl card-shadow p-5 flex flex-col gap-5">
                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">Title <span className="text-red-400">*</span></label>
                    <Input
                      {...register("title")}
                      placeholder="e.g. Sailor Moon Wig – Silver, Long"
                      className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-primary/30"
                    />
                    {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">Description <span className="text-red-400">*</span></label>
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
                      Fandom / Series
                      <span className="text-muted-foreground font-normal ml-2 text-xs">optional</span>
                    </label>
                    <Input
                      {...register("fandom")}
                      placeholder="e.g. Genshin Impact, Sailor Moon, Demon Slayer…"
                      className="bg-muted border-none h-12 rounded-xl text-sm font-medium focus-visible:ring-primary/30"
                    />
                  </div>

                  {/* Location — City Picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-foreground">
                      Location
                      <span className="text-muted-foreground font-normal ml-2 text-xs">where to meet for handoff</span>
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
                  <h2 className="text-2xl font-black text-foreground mb-1">Set your price</h2>
                  <p className="text-sm text-muted-foreground font-medium">You can offer both options at once.</p>
                </div>

                {/* For Sale */}
                <div className={`bg-white rounded-3xl card-shadow p-5 flex flex-col gap-4 transition-all ${isForSale ? "ring-2 ring-primary/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-foreground">For Sale</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">One-time purchase</p>
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
                      <p className="font-extrabold text-foreground">For Rent</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">Daily rental rate</p>
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
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">/ day</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Preview card */}
                {(getValues("title") || category) && (
                  <div className="bg-white rounded-3xl card-shadow p-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted shrink-0">
                        <img src={uploadedImages[0] || PLACEHOLDER[category]} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm line-clamp-1">{getValues("title") || "Your listing title"}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {activeCat?.emoji} {activeCat?.label}
                          {city && <> · 📍 {city}</>}
                        </p>
                        <div className="flex gap-2 mt-1.5">
                          {isForSale && salePrice && <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">₾{salePrice}</span>}
                          {isForRent && rentPrice && <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">₾{rentPrice}/d</span>}
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
                      "🚀 Publish Listing"
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
        <div className="absolute bottom-0 left-0 right-0 z-30 p-5 bg-gradient-to-t from-background via-background/95 to-transparent pt-10">
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              type="button"
              onClick={goNext}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-base shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {step === 1 ? "Next: Set Price" : "Next: Details"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
