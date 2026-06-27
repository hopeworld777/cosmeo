import { Sparkles } from "lucide-react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function BrandPanel() {
  const { i18n } = useTranslation();
  const isKa = i18n.language === "ka";

  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-violet-500 via-purple-400 to-fuchsia-300 relative overflow-hidden px-16 py-12">
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-[2.25rem] bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 shadow-xl">
          <Sparkles className="h-12 w-12 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-5xl font-black text-white mb-5">CosMeo</h1>
        <p className="text-white/75 text-base leading-relaxed max-w-xs">
          {isKa
            ? "საუკეთესო პლატფორმა ქართული კოსფლეი კომიუნითისთვის"
            : "The cosplay marketplace built for the Georgian gaming & cosplay community."}
        </p>
      </div>

      <p className="absolute bottom-8 text-white/40 text-xs font-medium z-10">cosmeo.ge</p>
    </div>
  );
}

/**
 * Shared wrapper for all authentication pages.
 *
 * Mobile: full-height centered layout (existing look, unchanged).
 * Desktop: two-column split — branded gradient left panel + white form right panel.
 *
 * Props:
 *   backHref  – optional href for a ← back link shown on desktop (top-left of right panel)
 *   backLabel – label for the back link
 */
export default function AuthLayout({ children, backHref, backLabel }) {
  return (
    <div className="flex min-h-full md:min-h-[100dvh] flex-col md:flex-row bg-background">
      <BrandPanel />

      <div className="relative flex flex-col justify-center flex-1 md:flex-none md:w-[520px] md:shrink-0 items-center px-6 pb-12 pt-14 md:px-14 md:py-12 bg-background md:bg-white">
        <div className="absolute top-11 right-6 md:top-8 md:right-8 z-50">
          <LanguageSwitcher />
        </div>

        {backHref && (
          <div className="hidden md:block absolute top-8 left-10">
            <Link href={backHref}>
              <button className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </button>
            </Link>
          </div>
        )}

        <div className="w-full max-w-sm mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
