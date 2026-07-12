import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";

const INVITE_CODE_KEY = "cosmeo_invite_code";

// /invite/:code — a reusable invite link (e.g. /invite/COSMEOBETA) that's
// shared out-of-band (Instagram DMs, email, etc). Anyone who lands here with
// a valid, active code gets it stashed for the register form to pick up,
// which grants VIP access (full app, no waitlist) on signup. An invalid
// code just falls through to the normal register/waitlist flow — no error
// shown, nothing to guess from the outside.
export default function Invite() {
  const { code } = useParams();
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { valid } = await api.auth.checkInvite(code);
        if (!cancelled && valid) {
          sessionStorage.setItem(INVITE_CODE_KEY, code.trim());
        }
      } catch {
        // Network/server error — treat like an invalid code, no crash.
      } finally {
        if (!cancelled) setLocation("/register");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return null;
}

export { INVITE_CODE_KEY };
