import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

// Full-screen lockout shown instead of the app for any banned/suspended
// account. Rendered directly by AppShell — it intercepts every route.
export default function RestrictedScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950 px-6"
      data-testid="screen-restricted"
    >
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-black text-white mb-3">
          {t("accountRestrictedTitle")}
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          {t("accountRestrictedBody")}
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@cosmeo.ge"
            className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
            data-testid="link-contact-support"
          >
            {t("contactSupport")}
          </a>
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 rounded-xl text-zinc-500 text-sm font-semibold hover:text-zinc-300 transition-colors"
            data-testid="button-restricted-logout"
          >
            {t("signOut", { defaultValue: "Sign Out" })}
          </button>
        </div>
      </div>
    </div>
  );
}
