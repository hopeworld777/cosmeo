import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import ItemDetail from "@/pages/ItemDetail";
import Sell from "@/pages/Sell";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import Wishlist from "@/pages/Wishlist";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function ProtectedRoute({ component: Component, ...rest }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) return null;
  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Component {...rest} />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="flex justify-center bg-background min-h-[100dvh] w-full">
        <div className="flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background relative border-x border-border/30 shadow-2xl">
          <div className="flex-1 overflow-y-auto no-scrollbar relative z-0 pb-20">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/browse" component={Browse} />
              <Route path="/item/:id" component={ItemDetail} />
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/sell"><ProtectedRoute component={Sell} /></Route>
              <Route path="/messages"><ProtectedRoute component={Messages} /></Route>
              <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
              <Route path="/wishlist"><ProtectedRoute component={Wishlist} /></Route>
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
    </AuthProvider>
  );
}
