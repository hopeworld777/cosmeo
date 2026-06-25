import { Settings, LogOut, Package, Star, ShoppingBag, BellRing } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Profile() {
  const user = {
    username: "MechaCrafter",
    handle: "@mechacrafter",
    bio: "Gundam & Eva builder. I rent out my armor suits.",
    rating: 4.9,
    sales: 24,
    joinDate: "Jan 2022",
    balance: "345.50"
  };

  const sections = [
    { title: "My Listings", icon: Package, count: 5 },
    { title: "Purchases & Rentals", icon: ShoppingBag, count: 12 },
    { title: "Reviews", icon: Star, count: 18 },
    { title: "Notifications", icon: BellRing, count: 3 },
  ];

  return (
    <div className="flex flex-col h-full bg-black pb-24">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-12 pb-4 px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        {/* Profile Card */}
        <div className="bg-card rounded-3xl p-6 border border-border/50 text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-primary/20 to-secondary/20" />
          
          <Avatar className="h-24 w-24 border-4 border-background mb-4 z-10">
            <AvatarFallback className="bg-primary text-white text-2xl font-bold">MC</AvatarFallback>
          </Avatar>
          
          <h2 className="text-xl font-bold z-10">{user.username}</h2>
          <p className="text-muted-foreground text-sm mb-3 z-10">{user.handle}</p>
          
          <p className="text-sm mb-6 z-10 max-w-[250px]">{user.bio}</p>
          
          <div className="flex w-full justify-between bg-background/50 rounded-2xl p-4 border border-border/50 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">{user.rating}</span>
              <span className="text-xs text-muted-foreground">Rating</span>
            </div>
            <Separator orientation="vertical" className="h-10 border-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">{user.sales}</span>
              <span className="text-xs text-muted-foreground">Sales</span>
            </div>
            <Separator orientation="vertical" className="h-10 border-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-secondary">${user.balance}</span>
              <span className="text-xs text-muted-foreground">Balance</span>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="mt-6 space-y-3">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">{section.title}</span>
                </div>
                {section.count > 0 && (
                  <span className="bg-muted text-muted-foreground text-xs font-bold px-2.5 py-1 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                    {section.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        <Button variant="outline" className="w-full mt-6 h-12 rounded-2xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
