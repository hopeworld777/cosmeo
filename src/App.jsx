import { Switch, Route, useLocation, Link } from "wouter";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import WaitlistLanding from "@/pages/WaitlistLanding";
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
import AdminDashboard from "@/pages/AdminDashboard";
import NewDashboard from "@/pages/NewDashboard";
import VipRegister from "@/pages/VipRegister";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import RestrictedScreen from "@/components/RestrictedScreen";
import ThemeToggle from "@/components/ThemeToggle";

// Routes that hide everything (login / register / etc.)
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/vip-signup"];

// ── Waitlist gate ─────────────────────────────────────────────────────────────
// During pre-launch, ONLY these paths are reachable without an admin account.
// Every other route — /browse, /home, /item/:id, etc. — is intercepted and the
// visitor is sent back to the waitlist landing page at "/".
// Secret admin-only login path — not listed anywhere public.
// Share only with trusted testers/admins. Visiting /login or /register
// now redirects unauthenticated users back to the waitlist landing page.
export const ADMIN_LOGIN_PATH = "/secret-admin-gate";

const WAITLIST_PUBLIC = [
  "/",
  ADMIN_LOGIN_PATH,       // secret admin login
  "/forgot-password",     // needed so admins can recover their password
  "/reset-password",      // needed to complete a password reset
  "/verify-email",        // needed to verify email after registration
  "/terms",
  "/vip-signup",          // secret tester registration — not linked anywhere public
];

// Onboarding gets its own full-screen desktop layout — no DesktopNav, but
// the shell should expand to full width on desktop (not stay phone-framed).
const ONBOARDING_ROUTES = ["/onboarding"];

// Routes that additionally hide the bottom tab bar (but NOT the desktop nav)
// "/" is the waitlist landing — it's a standalone pre-auth page, no bottom nav.
const HIDE_BOTTOM_NAV_EXTRA = ["/chat/", "/terms", "/item/", "/admin", "/"];

// Routes where the page renders its own LanguageSwitcher — suppress the
// floating mobile one to avoid duplication.  Prefix-matched for /settings/*.
// /chat is also listed here so the floating switcher is never shown inside chat.
// "/home" owns a lang switcher the same way "/" did before the waitlist split.
const OWN_LANG_ROUTES = ["/", "/home", "/sell", "/browse", "/messages", "/profile", "/wishlist", "/settings", "/terms", "/item", "/chat", "/admin"];

// Routes that render a fully standalone page (own header/chrome) — the
// global desktop nav and phone-frame shell must not wrap these.
const STANDALONE_ROUTES = ["/new-dashboard"];

function ownsLangSwitcher(location) {
  return OWN_LANG_ROUTES.some((r) => {
    if (r === "/") return location === "/";
    return location === r || location.startsWith(r + "/");
  });
}

function ProtectedRoute({ component: Component, ...rest }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Send unauthenticated visitors back to the waitlist landing, not /login
    // (the public login route no longer exists — only the secret admin path does).
    if (!loading && !user) setLocation("/");
  }, [loading, user]);

  if (loading) return null;
  if (!user) return null;
  return <Component {...rest} />;
}

function AdminRoute({ component: Component, ...rest }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) setLocation("/");
    else if (!user.is_admin) setLocation("/");
  }, [loading, user]);

  if (loading) return null;
  if (!user || !user.is_admin) return null;
  return <Component {...rest} />;
}

function OnboardingGuard() {
  // OnboardingGuard no longer redirects from "/" — that route now shows the
  // waitlist landing page for unauthenticated visitors. Onboarding is still
  // reachable directly at "/onboarding" (e.g. from the Register flow).
  return null;
}

// Renders nothing — exists purely for its redirect side-effect.
// Pre-launch gate: any route not on WAITLIST_PUBLIC is accessible only to
// logged-in admins. Non-admin authenticated users are logged out and bounced
// to "/"; unauthenticated visitors are sent straight to "/".
function WaitlistGate() {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = WAITLIST_PUBLIC.some(r =>
      r === "/" ? location === "/" : location === r || location.startsWith(r + "/")
    );
    if (isPublic) return;

    if (!user) {
      // Unauthenticated visitor typed a private URL directly → waitlist landing
      setLocation("/");
      return;
    }
    if (!user.is_admin) {
      // Logged-in but not an admin → clear session and send back to landing
      logout();
      setLocation("/");
    }
  }, [loading, user, location]);

  return null;
}

// "/" — shows the waitlist landing for guests; sends logged-in users to /home.
function RootRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) setLocation("/home");
  }, [loading, user]);

  if (loading || user) return null;
  return <WaitlistLanding />;
}

// ── Desktop top navigation bar ────────────────────────────────────────────────
// Visible on md+ screens for every non-auth route (including /terms).
function DesktopNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const links = [
    { href: "/home",     labelKey: "home"     },
    { href: "/browse",   labelKey: "browse"   },
    { href: "/sell",     labelKey: "sell"     },
    { href: "/messages", labelKey: "messages" },
    ...(user?.is_admin ? [{ href: "/admin", labelKey: "adminPanel", testId: "nav-admin" }] : []),
  ];

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-[80] h-16 items-center gap-8 px-8 bg-card/95 backdrop-blur-xl border-b border-border/20"
      style={{ boxShadow: "0 2px 16px rgba(124,58,237,0.07)" }}
    >
      <Link href="/home" className="font-black text-xl shrink-0 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        cosmeo
      </Link>

      <nav className="flex items-center gap-6 flex-1">
        {links.map(l => {
          const isActive = location === l.href || (l.href !== "/" && location.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              data-testid={l.testId}
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
        <ThemeToggle />
        {user && <NotificationBell />}
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
  const { user } = useAuth();

  // Auth routes hide everything (desktop nav, bottom nav, floating lang switcher).
  const isAuthRoute = AUTH_ROUTES.some(r => location.startsWith(r));
  const isOnboardingRoute = ONBOARDING_ROUTES.some(r => location.startsWith(r));
  // "/" is the waitlist landing — a full-screen standalone page for guests.
  // Authenticated users are redirected to /home immediately, so "/" always
  // means "unauthenticated" in practice; suppress the app chrome completely.
  const isWaitlist = location === "/";

  // Some non-auth routes also hide the bottom nav (chat, terms).
  const hideBottomNav = isAuthRoute || isOnboardingRoute || HIDE_BOTTOM_NAV_EXTRA.some(r => location.startsWith(r));

  // Show the floating mobile LanguageSwitcher only when the current page does
  // NOT provide its own (and we're not on an auth/onboarding page).
  const isStandaloneRoute = STANDALONE_ROUTES.some(r => location.startsWith(r));

  const showMobileFloatLang = !isAuthRoute && !isOnboardingRoute && !isStandaloneRoute && !ownsLangSwitcher(location);

  // Reset the mobile scroll container to the top on every route change.
  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [location]);

  // Banned/suspended accounts are locked out of the entire app, on every
  // route, the instant their session reports is_banned — no partial browsing.
  // This check runs after all hooks above so hook order stays stable across
  // the user object changing from null -> banned -> unbanned.
  if (user?.is_banned) return <RestrictedScreen />;

  return (
    <div className="flex justify-center bg-background min-h-[100dvh] w-full">
      {/* Desktop nav — hidden on auth/onboarding/standalone/waitlist routes */}
      {!isAuthRoute && !isOnboardingRoute && !isStandaloneRoute && !isWaitlist && <DesktopNav />}

      <div className={[
        "flex flex-col w-full relative bg-background",
        !isStandaloneRoute && !isWaitlist && "max-w-[430px] h-[100dvh] overflow-hidden border-x border-border/30 shadow-2xl",
        // Non-auth app pages: expand + add top padding for the fixed DesktopNav
        !isAuthRoute && !isOnboardingRoute && !isStandaloneRoute && !isWaitlist && "md:max-w-none md:h-auto md:min-h-[100dvh] md:overflow-visible md:border-x-0 md:shadow-none md:pt-16",
        // Auth + onboarding pages: expand but no top padding (they own their layout)
        (isAuthRoute || isOnboardingRoute) && !isStandaloneRoute && "md:max-w-none md:h-auto md:min-h-[100dvh] md:overflow-visible md:border-x-0 md:shadow-none",
        // Waitlist landing: full-bleed, no phone frame, no chrome
        isWaitlist && "w-full h-[100dvh] overflow-hidden md:max-w-none md:border-x-0 md:shadow-none",
        // Standalone pages (own full-bleed layout/header) — no phone frame, no padding at any size
        isStandaloneRoute && "w-full h-auto min-h-[100dvh] overflow-visible",
      ].filter(Boolean).join(" ")}>
        <OnboardingGuard />
        <WaitlistGate />

        {showMobileFloatLang && (
          <div className="md:hidden absolute top-3 right-3 z-[60] min-h-[44px] flex items-center">
            <LanguageSwitcher />
          </div>
        )}

        {/* data-scroll-container is used by pages (e.g. TermsAndSafety) that
            need to read or restore the mobile scroll position. */}
        <div
          ref={scrollRef}
          data-scroll-container
          className={[
            "flex-1 overflow-y-auto no-scrollbar relative z-0",
            !hideBottomNav && "pb-20",
            !isAuthRoute && !isStandaloneRoute && "md:overflow-visible md:pb-0",
            isStandaloneRoute && "overflow-visible pb-0",
          ].filter(Boolean).join(" ")}
        >
          <Switch>
            <Route path="/" component={RootRoute} />
            <Route path="/home" component={Home} />
            <Route path="/browse" component={Browse} />
            <Route path="/item/:id" component={ItemDetail} />
            {/* Secret admin login — path not linked anywhere public */}
            <Route path={ADMIN_LOGIN_PATH} component={Login} />
            {/* Registration disabled during closed-waitlist period */}
            {/* <Route path="/register" component={Register} /> */}
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
            <Route path="/vip-signup" component={VipRegister} />
            <Route path="/terms" component={TermsAndSafety} />
            <Route path="/admin"><AdminRoute component={AdminDashboard} /></Route>
            <Route path="/new-dashboard" component={NewDashboard} />
            <Route>
              <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                404 - Lost in the multiverse
              </div>
            </Route>
          </Switch>
        </div>

        {!hideBottomNav && <BottomNav />}
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
