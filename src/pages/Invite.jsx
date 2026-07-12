import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";

const INVITE_CODE_KEY = "cosmeo_invite_code";

// /invite/:code — a reusable invite link (e.g. /invite/COSMEOBETA) that's
// shared out-of-band (Instagram DMs, email, etc). Anyone who lands here with
// a valid, active code gets it stashed in sessionStorage — this is also what
// unlocks /login and /register for the rest of the browser session (see
// isAuthRoutePublic() in App.jsx), and it's what the register form picks up
// to grant VIP access (full app, no waitlist) on signup. An invalid code
// never unlocks anything — the visitor is bounced back to the waitlist
// landing, same as anyone who never had a link at all.
export default function Invite() {
  const { code } = useParams();
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { valid } = await api.auth.checkInvite(code);
        if (cancelled) return;
        if (valid) {
          sessionStorage.setItem(INVITE_CODE_KEY, code.trim());
          setLocation("/register");
        } else {
          setLocation("/");
        }
      } catch {
        // Network/server error — treat like an invalid code, no crash.
        if (!cancelled) setLocation("/");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return null;
}

export { INVITE_CODE_KEY };
