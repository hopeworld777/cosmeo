import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
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
import Onboarding from "@/pages/Onboarding";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";

const AUTH_ROUTES = ["/login", "/register", "/onboarding", "/forgot-password", "/reset-password", "/verify-email"];
const NO_BOTTOM_NAV = [...AUTH_ROUTES];

function ProtectedRoute({ component: Component, ...rest }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [loading, user]);

  if (loading) return null;
  if (!user) return null;
  return <Component {...rest} />;
}

function OnboardingGuard() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const onboarded = localStorage.getItem("kosmeo_onboarded");
    // Show onboarding on first visit (no account, never onboarded)
    if (!user && !onboarded && location === "/") {
      setLocation("/onboarding");
    }
  }, [loading, user, location]);

  return null;
}

function AppShell() {
  const [location] = useLocation();
  const hideNav = NO_BOTTOM_NAV.some(r => location.startsWith(r));

  return (
    <div className="flex justify-center bg-background min-h-[100dvh] w-full">
      <div className="flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background relative border-x border-border/30 shadow-2xl">
        <OnboardingGuard />
        <div className={`flex-1 overflow-y-auto no-scrollbar relative z-0 ${hideNav ? "" : "pb-20"}`}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/browse" component={Browse} />
            <Route path="/item/:id" component={ItemDetail} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route path="/verify-email" component={VerifyEmail} />
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
        {!hideNav && <BottomNav />}
        <Toaster />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
