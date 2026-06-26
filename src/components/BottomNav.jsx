import { Link, useLocation } from "wouter";
import { Home, Compass, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { href: "/", icon: Home, labelKey: "home", testId: "nav-home" },
    { href: "/browse", icon: Compass, labelKey: "browse", testId: "nav-browse" },
    { href: "/sell", icon: PlusCircle, labelKey: "sell", testId: "nav-sell", highlight: true },
    { href: "/messages", icon: MessageCircle, labelKey: "messages", testId: "nav-messages" },
    { href: "/profile", icon: User, labelKey: "profile", testId: "nav-profile" },
  ];

  if (location.startsWith("/item/")) return null;

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around bg-white/95 px-2 pb-4 backdrop-blur-xl" style={{ boxShadow: "0 -4px 24px rgba(139,92,246,0.08)" }}>
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;

        if (item.highlight) {
          return (
            <Link key={item.href} href={item.href} className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-primary to-secondary text-primary-foreground shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-transform hover:scale-105 active:scale-95 -translate-y-4" data-testid={item.testId}>
              <Icon className="h-6 w-6" />
            </Link>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 w-14 transition-colors relative",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )} data-testid={item.testId}>
            {isActive && (
              <div className="absolute inset-0 bg-primary/10 rounded-xl -z-10 scale-[1.15]" />
            )}
            <div className="relative">
              <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
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
