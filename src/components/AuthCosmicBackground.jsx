// ── Cosmic night-sky background for auth pages ──────────────────────────────
// Layered, lightweight (pure CSS/SVG) decoration: gradient blobs, twinkling
// stars, sparkles, drifting glow particles, and slow "wishing star" streaks.
// Purely decorative — pointer-events-none throughout — and respects
// prefers-reduced-motion by disabling all keyframe animation.

// 4-pointed sparkle, matches the mark used on the waitlist page.
function Sparkle({ size = 14, color = "#c4b5fd", opacity = 0.7, style = {} }) {
  const half = size / 2;
  const thin = size * 0.08;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", opacity, ...style }}
      aria-hidden="true"
    >
      <path
        d={`M${half},0 C${half},${half - thin} ${half + thin},${half} ${size},${half} C${half + thin},${half} ${half},${half + thin} ${half},${size} C${half},${half + thin} ${half - thin},${half} 0,${half} C${half - thin},${half} ${half},${half - thin} ${half},0 Z`}
        fill={color}
      />
    </svg>
  );
}

// Dreamy palette: pastel purple, lavender, soft pink, periwinkle blue, indigo.
const PALETTE = ["#c084fc", "#ddd6fe", "#f9a8d4", "#a5b4fc", "#818cf8"];

const BLOBS = [
  { top: "-14%", left: "-12%", size: 520, color: "#a855f7", darkOp: 0.16, lightOp: 0.32, dur: "22s", delay: "0s" },
  { top: "62%", left: "78%", size: 460, color: "#f472b6", darkOp: 0.13, lightOp: 0.26, dur: "26s", delay: "3s" },
  { top: "38%", left: "42%", size: 620, color: "#818cf8", darkOp: 0.09, lightOp: 0.18, dur: "30s", delay: "6s" },
  { top: "78%", left: "6%", size: 340, color: "#c4b5fd", darkOp: 0.1, lightOp: 0.22, dur: "20s", delay: "1.5s" },
  { top: "4%", left: "70%", size: 300, color: "#a5b4fc", darkOp: 0.11, lightOp: 0.24, dur: "24s", delay: "4.5s" },
];

// Small twinkling stars, spread widely and sparsely so the form stays clear.
const STARS = [
  { top: 6, left: 12, size: 2, delay: "0.2s", dur: "4.5s" },
  { top: 11, left: 26, size: 1.5, delay: "1.6s", dur: "6s" },
  { top: 4, left: 44, size: 2.5, delay: "3s", dur: "5s" },
  { top: 15, left: 58, size: 1.5, delay: "0.8s", dur: "7s" },
  { top: 8, left: 82, size: 2, delay: "2.4s", dur: "5.5s" },
  { top: 20, left: 92, size: 1.5, delay: "4s", dur: "6.5s" },
  { top: 30, left: 5, size: 2, delay: "1.2s", dur: "6s" },
  { top: 46, left: 15, size: 1.5, delay: "3.4s", dur: "5s" },
  { top: 58, left: 3, size: 2, delay: "0.5s", dur: "7s" },
  { top: 34, left: 95, size: 2.5, delay: "2s", dur: "5.5s" },
  { top: 52, left: 90, size: 1.5, delay: "4.4s", dur: "6s" },
  { top: 66, left: 96, size: 2, delay: "1s", dur: "6.5s" },
  { top: 72, left: 8, size: 1.5, delay: "2.8s", dur: "5s" },
  { top: 86, left: 18, size: 2, delay: "0.3s", dur: "7s" },
  { top: 92, left: 40, size: 1.5, delay: "3.6s", dur: "6s" },
  { top: 88, left: 66, size: 2, delay: "1.8s", dur: "5.5s" },
  { top: 94, left: 84, size: 1.5, delay: "4.8s", dur: "6.5s" },
  { top: 80, left: 94, size: 2, delay: "0.9s", dur: "5s" },
];

// Larger 4-pointed sparkles, kept in the outer margins away from the card.
const SPARKLES = [
  { top: 9, left: 8, size: 16, color: "#c084fc", op: 0.55, delay: "0s", dur: "5s" },
  { top: 14, left: 90, size: 13, color: "#f9a8d4", op: 0.5, delay: "1.4s", dur: "6s" },
  { top: 84, left: 12, size: 14, color: "#a5b4fc", op: 0.5, delay: "2.6s", dur: "5.5s" },
  { top: 90, left: 88, size: 12, color: "#ddd6fe", op: 0.45, delay: "0.8s", dur: "6.5s" },
  { top: 46, left: 4, size: 10, color: "#c4b5fd", op: 0.4, delay: "3.2s", dur: "5s" },
  { top: 50, left: 97, size: 11, color: "#f9a8d4", op: 0.4, delay: "1.8s", dur: "6s" },
];

// Gentle floating glow particles that drift slowly upward.
const PARTICLES = [
  { top: "16%", left: "20%", size: 3, color: "#c084fc", delay: "0s", dur: "9s" },
  { top: "70%", left: "24%", size: 2.5, color: "#f9a8d4", delay: "2.2s", dur: "11s" },
  { top: "28%", left: "70%", size: 3, color: "#a5b4fc", delay: "4s", dur: "10s" },
  { top: "62%", left: "78%", size: 2, color: "#ddd6fe", delay: "1.2s", dur: "8s" },
  { top: "42%", left: "50%", size: 2.5, color: "#818cf8", delay: "3.2s", dur: "12s" },
  { top: "82%", left: "48%", size: 2, color: "#c4b5fd", delay: "0.6s", dur: "9.5s" },
];

// Slow "wishing star" streaks that occasionally cross the sky.
const SHOOTING_STARS = [
  { top: "12%", left: "-10%", angle: 18, length: 140, delay: "1s", dur: "9s", pause: "11s" },
  { top: "55%", left: "-10%", angle: 12, length: 110, delay: "5s", dur: "10s", pause: "14s" },
  { top: "78%", left: "-10%", angle: 22, length: 130, delay: "9s", dur: "8s", pause: "16s" },
];

export default function AuthCosmicBackground({ isDark = true }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden auth-cosmic-bg" aria-hidden="true">
      {/* Blurred gradient blobs — depth layer */}
      {BLOBS.map((b, i) => (
        <div
          key={`blob-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            opacity: isDark ? b.darkOp : b.lightOp,
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            animation: `acb-drift ${b.dur} ${b.delay} ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Twinkling stars */}
      {STARS.map((s, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: isDark ? "#ffffff" : "#7c3aed",
            opacity: isDark ? 0.5 : 0.4,
            animation: `acb-twinkle ${s.dur} ${s.delay} ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Sparkles */}
      {SPARKLES.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            transform: "translate(-50%, -50%)",
            animation: `acb-sparkle ${s.dur} ${s.delay} ease-in-out infinite alternate`,
          }}
        >
          <Sparkle size={s.size} color={s.color} opacity={isDark ? s.op : s.op + 0.15} />
        </div>
      ))}

      {/* Floating glow particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: isDark ? 0.55 : 0.6,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `acb-float ${p.dur} ${p.delay} ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Shooting / wishing stars — static rotate on the wrapper, animation on the streak itself */}
      {SHOOTING_STARS.map((s, i) => (
        <div
          key={`shoot-${i}`}
          className="absolute"
          style={{
            top: s.top,
            left: s.left,
            width: 0,
            height: 0,
            transform: `rotate(${s.angle}deg)`,
            transformOrigin: "left center",
          }}
        >
          <div
            className="absolute"
            style={{
              width: s.length,
              height: 2,
              borderRadius: "999px",
              background: `linear-gradient(90deg, transparent 0%, ${isDark ? "rgba(255,255,255,0.9)" : "rgba(124,58,237,0.8)"} 70%, transparent 100%)`,
              opacity: 0,
              animation: `acb-shoot ${parseFloat(s.dur) + parseFloat(s.pause)}s ${s.delay} linear infinite`,
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes acb-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(24px, -18px) scale(1.08); }
        }
        @keyframes acb-twinkle {
          0%   { opacity: 0.15; transform: scale(1); }
          50%  { opacity: 0.7;  transform: scale(1.4); }
          100% { opacity: 0.15; transform: scale(1); }
        }
        @keyframes acb-sparkle {
          0%   { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          100% { transform: translate(-50%, -50%) translateY(-10px) rotate(12deg); }
        }
        @keyframes acb-float {
          0%   { transform: translateY(0px); opacity: 0.25; }
          50%  { opacity: 0.65; }
          100% { transform: translateY(-22px); opacity: 0.2; }
        }
        @keyframes acb-shoot {
          0%   { opacity: 0; transform: translateX(0); }
          2%   { opacity: 1; }
          14%  { opacity: 0; transform: translateX(160vw); }
          100% { opacity: 0; transform: translateX(160vw); }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-cosmic-bg * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
