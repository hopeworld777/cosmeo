import { useState } from "react";
import {
  Home as HomeIcon,
  BarChart2,
  Star,
  LayoutDashboard,
  Circle,
  Settings as SettingsIcon,
  Search,
  X,
  Heart,
  Home,
  Camera,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens (from the reference spec — kept local to this page so it
// doesn't leak into the rest of the app's theme).
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#1A1A1D",
  card: "#252529",
  cardBorder: "rgba(255,255,255,0.06)",
  pink: "#B645E9",
  blue: "#00D2FF",
  orange: "#FF9F43",
};

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: HomeIcon },
  { key: "statistics", label: "Statistics", icon: BarChart2 },
  { key: "media", label: "Media", icon: Star },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "reports", label: "Reports", icon: Circle, badge: 3 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const BREAKDOWN = [
  { label: "Lorem ipsum", pct: 40, color: COLORS.pink },
  { label: "Dolor", pct: 35, color: COLORS.blue },
  { label: "Sit amet", pct: 15, color: COLORS.orange },
];

const SPARK_CARDS = [
  { category: "Category", value: "$1282", delta: "+136" },
  { category: "Category", value: "$1282", delta: "+136" },
  { category: "Category", value: "$1282", delta: "+136" },
];

const RIGHT_WIDGETS = [
  { title: "Category name", sub: "Lorem ipsum", pct: 40, color: COLORS.pink, icon: Heart },
  { title: "Category name", sub: "Dolor sit", pct: 60, color: COLORS.blue, icon: Home },
  { title: "Category name", sub: "Amet", pct: 35, color: COLORS.orange, icon: Camera },
];

// A tiny wavy sparkline built as a static SVG path (no charting lib needed).
function Sparkline({ color }) {
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
      <path
        d="M0 22 C 10 8, 20 26, 30 14 S 50 6, 60 18 S 80 28, 90 12 S 98 10, 100 16"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}99)` }}
      />
    </svg>
  );
}

// Dual-ring glowing doughnut chart, drawn with layered SVG circles using
// stroke-dasharray segments (outer: blue/orange, inner: pink/purple).
function DoughnutChart() {
  const outerSegments = [
    { pct: 60, color: COLORS.orange },
    { pct: 40, color: COLORS.blue },
  ];
  const innerSegments = [{ pct: 100, color: COLORS.pink }];

  const R_OUTER = 70;
  const R_INNER = 50;
  const C_OUTER = 2 * Math.PI * R_OUTER;
  const C_INNER = 2 * Math.PI * R_INNER;

  let outerOffset = 0;
  let innerOffset = 0;

  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44 shrink-0">
      <g transform="rotate(-90 90 90)">
        {outerSegments.map((seg, i) => {
          const dash = (seg.pct / 100) * C_OUTER;
          const el = (
            <circle
              key={`o-${i}`}
              cx="90"
              cy="90"
              r={R_OUTER}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C_OUTER - dash}`}
              strokeDashoffset={-outerOffset}
              style={{ filter: `drop-shadow(0 0 8px ${seg.color}aa)` }}
            />
          );
          outerOffset += dash;
          return el;
        })}
        {innerSegments.map((seg, i) => {
          const dash = (seg.pct / 100) * C_INNER;
          const el = (
            <circle
              key={`i-${i}`}
              cx="90"
              cy="90"
              r={R_INNER}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C_INNER - dash}`}
              strokeDashoffset={-innerOffset}
              style={{ filter: `drop-shadow(0 0 10px ${seg.color}cc)` }}
            />
          );
          innerOffset += dash;
          return el;
        })}
      </g>
    </svg>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 8px ${color}aa`,
        }}
      />
    </div>
  );
}

export default function NewDashboard() {
  const [calloutOpen, setCalloutOpen] = useState(true);

  return (
    <div
      className="min-h-[100dvh] w-full flex justify-center p-4 md:p-8"
      style={{ background: COLORS.bg }}
    >
      <div className="w-full max-w-[1280px] flex gap-6">
        {/* ------------------------------------------------------------- */}
        {/* Left sidebar                                                   */}
        {/* ------------------------------------------------------------- */}
        <aside
          className="hidden md:flex flex-col w-60 shrink-0 rounded-3xl p-5"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
        >
          <div className="flex items-center gap-2 px-2 mb-10">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(${COLORS.blue}, ${COLORS.pink}, ${COLORS.orange}, ${COLORS.blue})`,
              }}
            >
              <div className="h-5 w-5 rounded-full" style={{ background: COLORS.bg }} />
            </div>
            <span className="text-white font-bold text-base tracking-tight">logotype</span>
          </div>

          <nav className="flex-1 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.key === "dashboard";
              return (
                <button
                  key={item.key}
                  data-testid={`nav-${item.key}`}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    active ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                  style={
                    active
                      ? {
                          background: `linear-gradient(135deg, ${COLORS.pink}55, ${COLORS.pink}22)`,
                          boxShadow: `0 0 20px ${COLORS.pink}44`,
                        }
                      : undefined
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span
                      className="h-5 min-w-[20px] px-1 rounded-md text-[11px] font-bold flex items-center justify-center text-white"
                      style={{ background: COLORS.pink, boxShadow: `0 0 10px ${COLORS.pink}aa` }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 px-2 pt-6 mt-6 border-t border-white/5">
            <div className="relative h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
              <Camera className="h-4 w-4 text-white/60" strokeWidth={1.75} />
              <span
                className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                style={{ background: COLORS.blue, borderColor: COLORS.card }}
              />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">User Name</p>
              <p className="text-white/40 text-xs leading-tight">Lorem ipsum</p>
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------------- */}
        {/* Central content                                                */}
        {/* ------------------------------------------------------------- */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/40 text-xs font-medium mb-1">Hello, User Name</p>
              <h1 className="text-white text-2xl md:text-[28px] font-bold tracking-tight">
                Welcome to Your Dashboard
              </h1>
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 min-w-[200px]"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
            >
              <span className="text-white/40 text-sm flex-1">Search</span>
              <Search className="h-4 w-4 text-white/40" />
            </div>
          </div>

          {/* Large top card: stat + breakdown + doughnut */}
          <div
            className="rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
          >
            <div className="flex-1 w-full">
              <p className="text-white/40 text-xs font-medium mb-1">Category name</p>
              <p className="text-white text-3xl font-bold mb-5">4725.05</p>

              <div className="flex flex-col gap-3">
                {BREAKDOWN.map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-white/50 text-xs w-20 shrink-0">{row.label}</span>
                    <div className="flex-1">
                      <ProgressBar pct={row.pct} color={row.color} />
                    </div>
                    <span className="text-white/70 text-xs font-semibold w-9 text-right">
                      {row.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <DoughnutChart />
          </div>

          {/* Sparkline cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SPARK_CARDS.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <p className="text-white/40 text-xs font-medium mb-1">{c.category}</p>
                <p className="text-white text-xl font-bold">{c.value}</p>
                <p className="text-white/40 text-xs mb-2">{c.delta}</p>
                <Sparkline color={[COLORS.pink, COLORS.orange, COLORS.pink][i % 3]} />
              </div>
            ))}
          </div>

          {/* Callout */}
          {calloutOpen && (
            <div
              className="relative rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden"
              style={{
                background: `linear-gradient(120deg, ${COLORS.pink}, #7C3FE4)`,
                boxShadow: `0 0 40px ${COLORS.pink}55`,
              }}
            >
              <button
                onClick={() => setCalloutOpen(false)}
                data-testid="button-close-callout"
                aria-label="Dismiss"
                className="absolute top-4 right-4 h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
              <p className="text-white font-semibold text-sm max-w-md pr-8">
                Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy.
              </p>
              <button
                data-testid="button-callout-cta"
                className="shrink-0 bg-white text-[#1A1A1D] text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
              >
                Button
              </button>
            </div>
          )}
        </main>

        {/* ------------------------------------------------------------- */}
        {/* Right widget column                                            */}
        {/* ------------------------------------------------------------- */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-4">
          {RIGHT_WIDGETS.map((w, i) => {
            const Icon = w.icon;
            return (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white text-sm font-bold leading-tight">{w.title}</p>
                    <p className="text-white/40 text-xs">{w.sub}</p>
                  </div>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${w.color}22`, boxShadow: `0 0 14px ${w.color}55` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: w.color }} strokeWidth={1.75} />
                  </div>
                </div>
                <p className="text-white/70 text-xs font-semibold mb-1.5">{w.pct}%</p>
                <ProgressBar pct={w.pct} color={w.color} />
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
