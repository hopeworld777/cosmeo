import { Link, useLocation } from "wouter";
import { Home, Compass, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Home", testId: "nav-home" },
  { href: "/browse", icon: Compass, label: "Discover", testId: "nav-browse" },
  { href: "/sell", icon: PlusCircle, label: "Sell", testId: "nav-sell", highlight: true },
  { href: "/messages", icon: MessageCircle, label: "Inbox", testId: "nav-messages" },
  { href: "/profile", icon: User, label: "Profile", testId: "nav-profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  // Hide nav on detail pages for more immersive feel
  if (location.startsWith("/item/")) return null;

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around border-t border-border/40 bg-background/80 px-2 pb-4 backdrop-blur-xl">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;

        if (item.highlight) {
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={item.testId}
                className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_rgba(180,60,255,0.4)] transition-transform hover:scale-105 active:scale-95 -translate-y-4"
              >
                <Icon className="h-6 w-6" />
              </div>
            </Link>
          );
        }

        return (
          <Link key={item.href} href={item.href}>
            <div
              data-testid={item.testId}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 w-14 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                {isActive && (
                  <span className="absolute -bottom-3 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium opacity-0">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
