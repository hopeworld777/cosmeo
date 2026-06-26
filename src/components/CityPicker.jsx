import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CITIES = [
  { key: "city_tbilisi", en: "Tbilisi",  flag: "🏙️" },
  { key: "city_batumi",  en: "Batumi",   flag: "🌊" },
  { key: "city_kutaisi", en: "Kutaisi",  flag: "🏛️" },
  { key: "city_rustavi", en: "Rustavi",  flag: "🏗️" },
  { key: "city_zugdidi", en: "Zugdidi",  flag: "🌿" },
  { key: "city_poti",    en: "Poti",     flag: "⚓" },
  { key: "city_gori",    en: "Gori",     flag: "🏔️" },
];

export default function CityPicker({ value, onChange, showAny = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = CITIES.filter(c =>
    t(c.key).toLowerCase().includes(query.toLowerCase()) ||
    c.en.toLowerCase().includes(query.toLowerCase())
  );

  const selected = CITIES.find(c => c.en === value);

  function pick(city) {
    onChange(city ? city.en : "");
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full h-12 rounded-xl bg-muted border-none px-4 flex items-center justify-between text-sm font-medium transition-all ${
          open ? "ring-2 ring-primary/30" : ""
        }`}
      >
        <span className="flex items-center gap-2.5">
          <MapPin className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground/50"}`} />
          {selected ? (
            <span className="text-foreground font-bold">
              {selected.flag} {t(selected.key)}
            </span>
          ) : (
            <span className="text-muted-foreground/60">
              {showAny ? t("anyCity") : t("selectCity")}
            </span>
          )}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-border/30 overflow-hidden"
          >
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t("searchCities")}
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-muted text-sm font-medium outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto no-scrollbar pb-2">
              {showAny && !query && (
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    !value
                      ? "bg-primary/8 text-primary"
                      : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">🌍</span>
                  <p className={`text-sm font-bold leading-tight ${!value ? "text-primary" : "text-foreground"}`}>
                    {t("anyCity")}
                  </p>
                  {!value && <span className="ml-auto text-xs font-black text-primary">✓</span>}
                </button>
              )}

              {filtered.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4 font-medium">{t("noCitiesFound")}</p>
              ) : (
                filtered.map(city => {
                  const isActive = city.en === value;
                  return (
                    <button
                      key={city.key}
                      type="button"
                      onClick={() => pick(city)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? "bg-primary/8 text-primary"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <span className="text-lg leading-none">{city.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                          {t(city.key)}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">{city.en}</p>
                      </div>
                      {isActive && (
                        <span className="text-xs font-black text-primary">✓</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
