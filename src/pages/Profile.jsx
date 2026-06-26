import { Settings, LogOut, Package, Star, ShoppingBag, Heart, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [listingCount, setListingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      api.listings.byUser(user.id)
        .then(listings => setListingCount(listings?.length || 0))
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const initial = user.username ? user.username.slice(0, 2).toUpperCase() : "U";

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const menuItems = [
    {
      title: "My Listings",
      icon: Package,
      count: listingCount,
      color: "bg-primary/10 text-primary",
      href: "/sell",
    },
    {
      title: "Wishlist",
      icon: Heart,
      count: null,
      color: "bg-secondary/10 text-secondary",
      href: "/wishlist",
    },
    {
      title: "Purchases & Rentals",
      icon: ShoppingBag,
      count: null,
      color: "bg-amber-100 text-amber-600",
      href: null,
    },
    {
      title: "Reviews",
      icon: Star,
      count: user.review_count || null,
      color: "bg-yellow-100 text-yellow-600",
      href: null,
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background pb-24">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-4 px-5 flex justify-between items-center border-b border-border/20">
        <h1 className="text-3xl font-black text-foreground">Profile</h1>
        <button
          onClick={() => setLocation("/settings")}
          className="h-11 w-11 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
          aria-label="Edit profile settings"
        >
          <Settings className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="p-4 pt-6 flex flex-col gap-5">

        {/* ── Profile card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] overflow-hidden card-shadow"
        >
          {/* Gradient banner */}
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

            {/* Stats row */}
            <div className="flex w-full justify-around mt-5 pt-5 border-t border-border/30">
              {[
                { label: "Rating", value: user.rating ? Number(user.rating).toFixed(1) : "New" },
                { label: "Sales", value: user.sales_count || 0 },
                { label: "Balance", value: `₾${Number(user.balance || 0).toFixed(0)}` },
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

        {/* ── Edit profile button ───────────────────────────────────── */}
        <button
          onClick={() => setLocation("/settings")}
          className="w-full h-12 rounded-2xl border-2 border-primary/30 text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Edit Profile & Settings
        </button>

        {/* ── Menu items ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                onClick={() => item.href && setLocation(item.href)}
                className={`flex items-center justify-between p-5 bg-white rounded-3xl card-shadow transition-all ${
                  item.href ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]" : "opacity-70 cursor-default"
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

        {/* ── Log out ──────────────────────────────────────────────── */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-14 rounded-2xl border-none bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 font-bold text-base card-shadow mt-1"
        >
          <LogOut className="h-5 w-5 mr-2.5" />
          Log Out
        </Button>

      </div>
    </div>
  );
}
