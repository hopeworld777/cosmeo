import { Switch, Route, useLocation, Link } from "wouter";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
import Settings from "@/pages/Settings";
import Chat from "@/pages/Chat";
import TermsAndSafety from "@/pages/TermsAndSafety";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const AUTH_ROUTES = ["/login", "/register", "/onboarding", "/forgot-password", "/reset-password", "/verify-email"];
const NO_BOTTOM_NAV = [...AUTH_ROUTES, "/chat/", "/terms"];

// Pages that carry their own language switcher via HeaderControls (or inline).
// AppShell suppresses its floating mobile switcher on these routes to avoid duplicates.
const OWN_LANG_ROUTES = ["/", "/sell", "/browse", "/messages", "/profile", "/wishlist", "/settings"];

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
    if (!user && !onboarded && location === "/") {
      setLocation("/onboarding");
    }
  }, [loading, user, location]);

  return null;
}

// ── Desktop top navigation bar ────────────────────────────────────────────────
// Visible only on md+ screens. Hidden on mobile (BottomNav handles mobile nav).
function DesktopNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const links = [
    { href: "/",         labelKey: "home"     },
    { href: "/browse",   labelKey: "browse"   },
    { href: "/sell",     labelKey: "sell"     },
    { href: "/messages", labelKey: "messages" },
  ];

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-[80] h-16 items-center gap-8 px-8 bg-white/95 backdrop-blur-xl border-b border-border/20"
      style={{ boxShadow: "0 2px 16px rgba(124,58,237,0.07)" }}
    >
      <Link href="/" className="font-black text-xl shrink-0 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        CosMeo
      </Link>

      <nav className="flex items-center gap-6 flex-1">
        {links.map(l => {
          const isActive = location === l.href || (l.href !== "/" && location.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-bold transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(l.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-4 shrink-0">
        <LanguageSwitcher />
        {user ? (
          <Link href="/profile">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-sm cursor-pointer hover:opacity-90 transition-opacity">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          </Link>
        ) : (
          <Link href="/login">
            <button className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
              {t("signIn")}
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}

function AppShell() {
  const [location] = useLocation();
  const hideNav = NO_BOTTOM_NAV.some(r => location.startsWith(r));
  const showMobileFloatLang = !hideNav && !OWN_LANG_ROUTES.includes(location);
  const isAuthRoute = hideNav;

  // Always scroll the app container back to the top on every route change.
  // useLayoutEffect fires synchronously before any child useEffect, so pages
  // that want to restore their own scroll position (e.g. TermsAndSafety) can
  // do so in their own useEffect and it will run *after* this reset.
  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [location]);

  return (
    <div className="flex justify-center bg-background min-h-[100dvh] w-full">
      {!hideNav && <DesktopNav />}

      <div className={[
        "flex flex-col w-full relative bg-background",
        "max-w-[430px] h-[100dvh] overflow-hidden border-x border-border/30 shadow-2xl",
        !isAuthRoute && "md:max-w-none md:h-auto md:min-h-[100dvh] md:overflow-visible md:border-x-0 md:shadow-none md:pt-16",
      ].filter(Boolean).join(" ")}>
        <OnboardingGuard />

        {showMobileFloatLang && (
          <div className="md:hidden absolute top-3 right-3 z-[60] min-h-[44px] flex items-center">
            <LanguageSwitcher />
          </div>
        )}

        <div className={[
          "flex-1 overflow-y-auto no-scrollbar relative z-0",
          !hideNav && "pb-20",
          !isAuthRoute && "md:overflow-visible md:pb-0",
        ].filter(Boolean).join(" ")}>
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
            <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
            <Route path="/sell"><ProtectedRoute component={Sell} /></Route>
            <Route path="/messages"><ProtectedRoute component={Messages} /></Route>
            <Route path="/chat/:id"><ProtectedRoute component={Chat} /></Route>
            <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
            <Route path="/wishlist"><ProtectedRoute component={Wishlist} /></Route>
            <Route path="/terms" component={TermsAndSafety} />
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
