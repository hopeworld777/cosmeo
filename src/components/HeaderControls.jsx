import { Link } from "wouter";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Shared right-side header group: language pill + avatar/settings button.
 * variant="avatar"   → profile avatar or sign-in button  (Home, Browse, Messages, Wishlist)
 * variant="settings" → gear icon button                   (Profile)
 */
export default function HeaderControls({ variant = "avatar" }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <LanguageSwitcher />

      {variant === "settings" ? (
        <Link href="/settings">
          <button
            className="h-11 w-11 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0"
            aria-label={t("settingsLabel") || "Settings"}
          >
            <Settings className="h-5 w-5 text-foreground" />
          </button>
        </Link>
      ) : user ? (
        <Link href="/profile">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md cursor-pointer shrink-0"
            aria-label={t("profile") || "Profile"}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-black text-base">
                {user.username?.charAt(0).toUpperCase()}
              </span>
            )}
          </motion.div>
        </Link>
      ) : (
        <Link href="/login">
          <button className="h-11 px-4 rounded-full bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors shrink-0 whitespace-nowrap">
            {t("signIn")}
          </button>
        </Link>
      )}
    </div>
  );
}
