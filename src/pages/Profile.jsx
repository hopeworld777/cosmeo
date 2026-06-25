import { Settings, LogOut, Package, Star, ShoppingBag, BellRing } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [listingCount, setListingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      api.listings.byUser(user.id).then(listings => {
        setListingCount(listings?.length || 0);
      }).catch(console.error);
    }
  }, [user]);

  if (!user) return null;

  const sections = [
    { title: "My Listings", icon: Package, count: listingCount },
    { title: "Purchases & Rentals", icon: ShoppingBag, count: 0 },
    { title: "Reviews", icon: Star, count: user.review_count || 0 },
    { title: "Notifications", icon: BellRing, count: 0 },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const initial = user.username ? user.username.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="flex flex-col h-full bg-background pb-24">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-4 px-4 flex justify-between items-center rounded-b-3xl shadow-sm">
        <h1 className="text-3xl font-black text-foreground">Profile</h1>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-muted h-12 w-12">
          <Settings className="h-6 w-6" />
        </Button>
      </div>

      <div className="p-4 pt-6">
        {/* Profile Card */}
        <div className="bg-white rounded-[2.5rem] p-6 text-center flex flex-col items-center relative overflow-hidden card-shadow">
          <div className="absolute top-0 left-0 right-0 h-32 pastel-gradient" />
          
          <Avatar className="h-28 w-28 border-4 border-white mb-4 z-10 shadow-lg mt-4">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-primary text-white text-3xl font-black">{initial}</AvatarFallback>
          </Avatar>
          
          <h2 className="text-2xl font-black z-10 text-foreground">{user.username}</h2>
          
          <p className="text-base font-medium mb-8 mt-2 z-10 max-w-[280px] text-muted-foreground">{user.bio || "No bio yet."}</p>
          
          <div className="flex w-full justify-between bg-muted/50 rounded-3xl p-5 z-10 border border-border/50">
            <div className="flex flex-col items-center flex-1">
              <span className="text-2xl font-black text-foreground">{user.rating || "New"}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">Rating</span>
            </div>
            <Separator orientation="vertical" className="h-12 w-px bg-border/80" />
            <div className="flex flex-col items-center flex-1">
              <span className="text-2xl font-black text-foreground">{user.sales_count || 0}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">Sales</span>
            </div>
            <Separator orientation="vertical" className="h-12 w-px bg-border/80" />
            <div className="flex flex-col items-center flex-1">
              <span className="text-2xl font-black text-secondary">${user.balance || "0.00"}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">Balance</span>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="mt-8 space-y-4">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="flex items-center justify-between p-5 bg-white rounded-3xl card-shadow hover:-translate-y-1 transition-transform cursor-pointer group">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-extrabold text-lg text-foreground">{section.title}</span>
                </div>
                {section.count > 0 && (
                  <span className="bg-primary/10 text-primary text-sm font-black px-3.5 py-1.5 rounded-full">
                    {section.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        <Button onClick={handleLogout} variant="outline" className="w-full mt-8 h-16 rounded-2xl border-none bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 font-bold text-lg card-shadow">
          <LogOut className="h-5 w-5 mr-3" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
