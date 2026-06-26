import { Link, useLocation } from "wouter";
import { Home, Compass, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const POLL_INTERVAL = 30_000;

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  async function fetchUnread() {
    if (!user) { setUnreadCount(0); return; }
    try {
      const convs = await api.messages.conversations();
      const total = (convs || []).reduce(
        (sum, c) => sum + (Number(c.unread_count) || 0), 0
      );
      setUnreadCount(total);
    } catch {
      // Silently ignore — badge just won't update
    }
  }

  useEffect(() => {
    fetchUnread();
    timerRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [user]);

  // Clear badge when user navigates to Messages
  useEffect(() => {
    if (location === "/messages") setUnreadCount(0);
  }, [location]);

  const navItems = [
    { href: "/",         icon: Home,          labelKey: "home",     testId: "nav-home"     },
    { href: "/browse",   icon: Compass,       labelKey: "browse",   testId: "nav-browse"   },
    { href: "/sell",     icon: PlusCircle,    labelKey: "sell",     testId: "nav-sell",    highlight: true },
    { href: "/messages", icon: MessageCircle, labelKey: "messages", testId: "nav-messages", badge: unreadCount },
    { href: "/profile",  icon: User,          labelKey: "profile",  testId: "nav-profile"  },
  ];

  if (location.startsWith("/item/") || location === "/sell") return null;

  return (
    <nav
      className="md:hidden absolute bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around bg-white/95 px-2 pb-4 backdrop-blur-xl"
      style={{ boxShadow: "0 -4px 24px rgba(139,92,246,0.08)" }}
    >
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-primary to-secondary text-primary-foreground shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-transform hover:scale-105 active:scale-95 -translate-y-4"
              data-testid={item.testId}
            >
              <Icon className="h-6 w-6" />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1 w-14 transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={item.testId}
          >
            {isActive && (
              <div className="absolute inset-0 bg-primary/10 rounded-xl -z-10 scale-[1.15]" />
            )}

            {/* Icon + optional badge */}
            <div className="relative">
              <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />

              <AnimatePresence>
                {item.badge > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 shadow-[0_2px_8px_rgba(239,68,68,0.5)] leading-none"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <span className={cn("text-[10px] font-bold transition-opacity", isActive ? "opacity-100" : "opacity-70")}>
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
