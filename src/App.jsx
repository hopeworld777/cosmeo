import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import ItemDetail from "@/pages/ItemDetail";
import Sell from "@/pages/Sell";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import Wishlist from "@/pages/Wishlist";

export default function App() {
  return (
    <div className="flex justify-center bg-black min-h-[100dvh] w-full">
      <div className="flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background relative border-x border-border/50 shadow-2xl">
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-0 pb-20">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/browse" component={Browse} />
            <Route path="/item/:id" component={ItemDetail} />
            <Route path="/sell" component={Sell} />
            <Route path="/messages" component={Messages} />
            <Route path="/profile" component={Profile} />
            <Route path="/wishlist" component={Wishlist} />
            <Route>
              <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                404 - Lost in the multiverse
              </div>
            </Route>
          </Switch>
        </div>
        <BottomNav />
        <Toaster />
      </div>
    </div>
  );
}
