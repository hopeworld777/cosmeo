import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Check, Camera } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

const GEO_CITIES = [
  "Tbilisi", "Kutaisi", "Batumi", "Rustavi",
  "Gori", "Zugdidi", "Poti", "Akhaltsikhe",
];

function getScrollEl() {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(min-width: 768px)").matches) return window;
  return document.querySelector("[data-scroll-container]") || window;
}
function getScrollTop() {
  const el = getScrollEl();
  if (!el) return 0;
  return el === window ? window.scrollY : el.scrollTop;
}
function restoreScrollTop(top) {
  const el = getScrollEl();
  if (!el) return;
  if (el === window) window.scrollTo({ top, behavior: "instant" });
  else el.scrollTop = top;
}

// Scroll position saved when leaving /settings for a submenu.
// null means "no saved position" — do not restore on next mount.
let _savedScrollTop = null;
let _isGoingToSubpage = false;

function markSubpageNav() {
  _isGoingToSubpage = true;
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(false);
  const { t } = useTranslation();

  const schema = z.object({
    username: z
      .string()
      .min(2, t("usernameMin"))
      .max(30, t("usernameMax"))
      .regex(/^[a-zA-Z0-9_]+$/, t("usernamePattern")),
    bio: z.string().max(200, t("bioMax")),
    location: z.string(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user?.username || "",
      bio: user?.bio || "",
      location: user?.location || "",
    },
  });

  const bioValue = watch("bio") || "";

  // ── Avatar upload state — MUST be declared before any early return ──────
  const avatarInputRef = useRef(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview]         = useState(null);

  // Revoke the object URL when the preview is replaced or component unmounts
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  // Save scroll in layout-effect cleanup so it fires BEFORE AppShell resets
  // the container. Only persist the position when going to a submenu page.
  useLayoutEffect(() => {
    return () => {
      if (_isGoingToSubpage) {
        _savedScrollTop = getScrollTop();
        _isGoingToSubpage = false;
      } else {
        _savedScrollTop = null;
      }
    };
  }, []);

  // Restore scroll after AppShell's layout-effect has already run (and reset
  // the container to 0). rAF lets the page content paint before jumping.
  useEffect(() => {
    if (_savedScrollTop === null) return;
    const top = _savedScrollTop;
    const id = requestAnimationFrame(() => restoreScrollTop(top));
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const initial = user.username?.slice(0, 2).toUpperCase() || "U";

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setPendingAvatarFile(file);
    e.target.value = "";
  };

  const onSubmit = async (data) => {
    try {
      let newAvatarUrl = null;

      if (pendingAvatarFile) {
        const { avatar_url } = await api.upload.avatar(pendingAvatarFile);
        newAvatarUrl = avatar_url;
      }

      const updated = await api.auth.updateMe({
        username: data.username.trim(),
        bio: data.bio,
        location: data.location || null,
      });

      const merged = newAvatarUrl ? { ...updated, avatar_url: newAvatarUrl } : updated;
      setUser(merged);
      reset({
        username: merged.username,
        bio: merged.bio || "",
        location: merged.location || "",
      });

      setPendingAvatarFile(null);
      setAvatarPreview(null);
      setSaved(true);
      toast({ title: t("profileUpdated"), description: t("changesSavedDesc") });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast({ title: t("couldNotSave"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-background pb-28">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-4 px-5 border-b border-border/20">
        <div className="flex items-center gap-3 md:max-w-2xl md:mx-auto">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/profile")}
            className="h-11 w-11 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-black text-foreground flex-1">{t("editProfile")}</h1>
          <LanguageSwitcher />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-5 pt-6 md:max-w-2xl md:mx-auto md:w-full">

        {/* ── Avatar ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 py-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => avatarInputRef.current?.click()}
            className="relative focus:outline-none group"
            data-testid="button-avatar-upload"
            aria-label="Change profile photo"
          >
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarImage src={avatarPreview || user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl font-black">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center shadow-md transition-all ${pendingAvatarFile ? "bg-secondary" : "bg-primary"} group-hover:opacity-80`}>
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
            {isSubmitting && pendingAvatarFile && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </div>
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            data-testid="input-avatar-file"
          />
          <p className="text-xs text-muted-foreground font-medium">
            {pendingAvatarFile
              ? t("newPhotoSelected", "New photo selected — tap Save")
              : t("tapToChangePhoto", "Tap to change photo")}
          </p>
        </div>

        {/* ── Profile info card ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl card-shadow p-5 flex flex-col gap-5">
          <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
            {t("profileInfo")}
          </h2>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground">{t("username")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm select-none">
                @
              </span>
              <Input
                {...register("username")}
                placeholder="your_handle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="pl-8 h-12 rounded-xl bg-muted border-none text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            {errors.username ? (
              <p className="text-xs text-red-500 font-medium">{errors.username.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-medium">
                {t("usernameHint")}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-foreground">
                {t("bio")}
                <span className="text-muted-foreground font-normal ml-2 text-xs">{t("optional")}</span>
              </label>
              <span className={`text-xs font-bold ${bioValue.length > 180 ? "text-amber-500" : "text-muted-foreground"}`}>
                {bioValue.length}/200
              </span>
            </div>
            <textarea
              {...register("bio")}
              placeholder={t("bioPlaceholder")}
              rows={3}
              className="w-full rounded-xl bg-muted border-none p-3.5 text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/50 transition-shadow leading-relaxed"
            />
            {errors.bio && (
              <p className="text-xs text-red-500 font-medium">{errors.bio.message}</p>
            )}
          </div>

          {/* City dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {t("cityLabel")}
            </label>
            <div className="relative">
              <select
                {...register("location")}
                className="w-full h-12 rounded-xl bg-muted border-none px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/25 transition-shadow appearance-none cursor-pointer text-foreground"
              >
                <option value="">{t("selectYourCity")}</option>
                {GEO_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                  <path d="M1 1L6 6L11 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {errors.location && (
              <p className="text-xs text-red-500 font-medium">{errors.location.message}</p>
            )}
          </div>
        </div>

        {/* ── Account info card (read-only) ─────────────────────────── */}
        <div className="bg-white rounded-3xl card-shadow p-5 flex flex-col gap-1">
          <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider mb-3">
            {t("accountSection")}
          </h2>

          <div className="flex items-center justify-between py-2.5 border-b border-border/30">
            <span className="text-sm font-medium text-muted-foreground">{t("email")}</span>
            <span className="text-sm font-bold text-foreground truncate max-w-[180px]">{user.email}</span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm font-medium text-muted-foreground">{t("emailVerified")}</span>
            {user.email_verified ? (
              <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" />
                {t("verified")}
              </span>
            ) : (
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {t("pending")}
              </span>
            )}
          </div>
        </div>

        {/* ── Stats card (read-only) ────────────────────────────────── */}
        <div className="bg-white rounded-3xl card-shadow p-5">
          <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider mb-4">
            {t("statsSection")}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { labelKey: "rating",       value: user.rating || "New" },
              { labelKey: "salesLabel",   value: user.sales_count || 0 },
              { labelKey: "reviewsCount", value: user.review_count || 0 },
            ].map((stat) => (
              <div key={stat.labelKey} className="flex flex-col items-center bg-muted/50 rounded-2xl p-3">
                <span className="text-xl font-black text-foreground">{stat.value}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-0.5">
                  {t(stat.labelKey)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Save button ───────────────────────────────────────────── */}
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            type="submit"
            disabled={isSubmitting || (!isDirty && !saved)}
            className={`w-full h-14 rounded-2xl text-base font-bold shadow-md transition-all duration-300 ${
              saved
                ? "bg-green-500 hover:bg-green-500 text-white shadow-green-200"
                : "bg-primary hover:bg-primary/90 text-white"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2.5">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                {t("saving")}
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2.5">
                <Check className="h-5 w-5" />
                {t("changesSaved")}
              </span>
            ) : (
              t("saveChanges")
            )}
          </Button>
        </motion.div>

        {!isDirty && !saved && (
          <p className="text-xs text-center text-muted-foreground font-medium -mt-2">
            {t("makeAChange")}
          </p>
        )}

        <Link
          href="/terms"
          onClick={markSubpageNav}
          className="text-xs text-muted-foreground underline mt-4 block text-center"
        >
          {t("tos_pageTitle")}
        </Link>

      </form>
    </div>
  );
}
