// ── Cosmic night-sky background for auth pages ──────────────────────────────
// Layered decoration: gradient blobs, twinkling stars, sparkles, drifting glow
// particles, and canvas-rendered wishing stars that travel along unique cubic
// Bezier arcs with curved trails and glowing 4-point star heads.
// Purely decorative — pointer-events-none throughout — and respects
// prefers-reduced-motion by disabling all animation.

import { useEffect, useRef } from "react";

// ── Canvas wishing-star renderer ─────────────────────────────────────────────
// Draws 5 shooting stars along unique cubic Bezier curves. Each star:
//   • Follows a different arc across the sky (no two paths are alike)
//   • Accelerates naturally (power-easing on the parameter)
//   • Carries a curved trail of sampled Bezier points (blue→purple→pink)
//   • Leaves tiny perpendicular sparkle-dust particles
//   • Has a 4-point magical star head with bloom and inner glow
//   • Fades in smoothly and fades out as it exits
// The canvas is DPR-aware for sharp rendering on retina screens.

function cubicBezier(P0, P1, P2, P3, t) {
  const m = 1 - t;
  return [
    m**3*P0[0] + 3*m**2*t*P1[0] + 3*m*t**2*P2[0] + t**3*P3[0],
    m**3*P0[1] + 3*m**2*t*P1[1] + 3*m*t**2*P2[1] + t**3*P3[1],
  ];
}

function cubicBezierTangent(P0, P1, P2, P3, t) {
  const m = 1 - t;
  return [
    3*(m**2*(P1[0]-P0[0]) + 2*m*t*(P2[0]-P1[0]) + t**2*(P3[0]-P2[0])),
    3*(m**2*(P1[1]-P0[1]) + 2*m*t*(P2[1]-P1[1]) + t**2*(P3[1]-P2[1])),
  ];
}

// Builds 5 unique crossing arcs scaled to the current viewport.
// Called once on mount and again on resize so paths always fit the screen.
function buildStarPaths(W, H) {
  return [
    // 1 — Gentle upper arc, sweeps from top-left toward lower-right
    {
      P0: [-200, H * 0.12], P1: [W * 0.28, H * -0.04],
      P2: [W * 0.65, H * 0.26], P3: [W + 200, H * 0.40],
      dur: 9, delay: 1.0, cycle: 22,
      c1: "#60a5fa", c2: "#a855f7", c3: "#f472b6",
    },
    // 2 — Mid-screen gentle S-like sweep
    {
      P0: [-180, H * 0.62], P1: [W * 0.25, H * 0.50],
      P2: [W * 0.68, H * 0.56], P3: [W + 200, H * 0.42],
      dur: 11, delay: 6.5, cycle: 26,
      c1: "#818cf8", c2: "#c084fc", c3: "#f9a8d4",
    },
    // 3 — Steeper arc that dips then rises toward bottom-right
    {
      P0: [-220, H * 0.22], P1: [W * 0.18, H * 0.04],
      P2: [W * 0.58, H * 0.44], P3: [W + 200, H * 0.70],
      dur: 8,  delay: 13.0, cycle: 30,
      c1: "#a5b4fc", c2: "#e879f9", c3: "#f472b6",
    },
    // 4 — Low shallow arc grazing the bottom quarter
    {
      P0: [-180, H * 0.78], P1: [W * 0.38, H * 0.68],
      P2: [W * 0.72, H * 0.74], P3: [W + 220, H * 0.58],
      dur: 13, delay: 4.0, cycle: 34,
      c1: "#60a5fa", c2: "#7c3aed", c3: "#ec4899",
    },
    // 5 — Near-top wide arc that crests upward then flattens out
    {
      P0: [-200, H * 0.40], P1: [W * 0.14, H * 0.22],
      P2: [W * 0.52, H * 0.16], P3: [W + 180, H * 0.24],
      dur: 10, delay: 18.0, cycle: 38,
      c1: "#93c5fd", c2: "#a855f7", c3: "#fb7185",
    },
  ];
}

function WishingStarsCanvas({ isDark }) {
  const canvasRef = useRef(null);
  const isDarkRef = useRef(isDark);
  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let raf;
    let paths = [];

    // DPR-aware sizing so stars are crisp on retina displays
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W   = window.innerWidth;
      const H   = window.innerHeight;
      canvas.width        = W * dpr;
      canvas.height       = H * dpr;
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before re-scaling
      ctx.scale(dpr, dpr);
      paths = buildStarPaths(W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    const startTime = performance.now();

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      const elapsed = (now - startTime) / 1000; // seconds
      const dark    = isDarkRef.current;

      paths.forEach((star) => {
        const tAdj = elapsed - star.delay;
        if (tAdj < 0) return;                          // still in initial delay

        const cycleTime = tAdj % star.cycle;
        if (cycleTime > star.dur) return;              // resting between passes

        const tLinear = cycleTime / star.dur;           // 0 → 1, linear time

        // Power-ease: star accelerates as it crosses the sky
        const tPos = Math.pow(tLinear, 1.55);

        // Opacity envelope: fade in over first 8%, hold, fade out over last 18%
        const opacity =
          tLinear < 0.08 ? tLinear / 0.08
          : tLinear > 0.82 ? 1 - (tLinear - 0.82) / 0.18
          : 1;
        const baseAlpha = Math.max(0, Math.min(1, opacity)) * (dark ? 0.90 : 0.70);
        if (baseAlpha < 0.01) return;

        const [px, py] = cubicBezier(
          star.P0, star.P1, star.P2, star.P3, tPos
        );
        const [tangX, tangY] = cubicBezierTangent(
          star.P0, star.P1, star.P2, star.P3, tPos
        );
        const angle = Math.atan2(tangY, tangX);

        // ── Curved trail ───────────────────────────────────────────────────
        // Sample 32 points behind the star along the Bezier curve.
        // Because they're taken from the same curve, the trail follows every
        // twist of the arc automatically — no straight lines anywhere.
        const TRAIL  = 32;
        const DT     = 0.058; // how far back in tPos-space the trail reaches
        const tTail  = Math.max(0, tPos - DT);

        for (let j = 0; j <= TRAIL; j++) {
          const sample = tTail + (tPos - tTail) * (j / TRAIL);
          const [sx, sy] = cubicBezier(star.P0, star.P1, star.P2, star.P3, sample);
          const frac = j / TRAIL; // 0 = tail, 1 = head

          // Radius: whisper-thin at tail, swells to 1.5 near head
          const r = 0.25 + frac * 1.5;

          // Colour gradient along the trail: blue → purple → pink
          const col = frac < 0.38 ? star.c1 : frac < 0.72 ? star.c2 : star.c3;

          // Opacity: near-zero at tail, bright near head
          const trailAlpha = baseAlpha * Math.pow(frac, 1.4) * 0.85;

          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.globalAlpha = trailAlpha;
          ctx.fill();
        }

        // ── Sparkle dust ───────────────────────────────────────────────────
        // Tiny dots offset perpendicularly from the trail — each one on a
        // slightly different Bezier sample so they scatter naturally along
        // the curve rather than in a straight line.
        const PERP = angle + Math.PI / 2;
        const dustFracs = [0.14, 0.26, 0.40, 0.54, 0.66, 0.78, 0.88, 0.95];
        dustFracs.forEach((f, j) => {
          const tDust = tTail + (tPos - tTail) * f;
          const [dx, dy] = cubicBezier(star.P0, star.P1, star.P2, star.P3, tDust);
          const side   = j % 2 === 0 ? 1 : -1;
          const spread = side * (1.8 + (j % 3) * 1.6);
          const nx = dx + Math.cos(PERP) * spread;
          const ny = dy + Math.sin(PERP) * spread;
          const col = j % 3 === 0 ? star.c1 : j % 3 === 1 ? star.c2 : star.c3;

          ctx.beginPath();
          ctx.arc(nx, ny, 0.62, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.globalAlpha = baseAlpha * (1 - f) * 0.55 + baseAlpha * f * 0.32;
          ctx.fill();
        });

        // ── 4-point magical star head ──────────────────────────────────────
        ctx.save();
        ctx.globalAlpha = baseAlpha;
        ctx.translate(px, py);
        ctx.rotate(angle); // star faces the direction of travel

        // Outer bloom (large, blurred)
        const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        bloom.addColorStop(0, star.c3 + "55");
        bloom.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = bloom;
        ctx.fill();

        // Mid-glow halo
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 4.5);
        halo.addColorStop(0, star.c2 + "99");
        halo.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // 4-point sparkle star (same bezier-curve construction as the SVG
        // Sparkle — four quadrants, each a shallow S-curve through the origin)
        const SZ = 3.8, TH = 0.62;
        ctx.beginPath();
        ctx.moveTo(0, -SZ);
        ctx.bezierCurveTo( 0,  -TH,  TH,   0,  SZ,   0);
        ctx.bezierCurveTo( TH,   0,   0,  TH,   0,  SZ);
        ctx.bezierCurveTo(  0,  TH, -TH,   0, -SZ,   0);
        ctx.bezierCurveTo(-TH,   0,   0, -TH,   0, -SZ);
        ctx.closePath();
        ctx.shadowBlur  = 6;
        ctx.shadowColor = star.c3;
        ctx.fillStyle   = "rgba(255,255,255,0.97)";
        ctx.fill();
        ctx.shadowBlur  = 0;

        // Tiny bright core dot
        ctx.beginPath();
        ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
      });

      ctx.globalAlpha = 1; // always restore global alpha
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []); // isDark changes handled via ref above

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

// ── 4-pointed sparkle SVG ─────────────────────────────────────────────────────
// Matches the mark used on the waitlist page.
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

      {/* Canvas wishing stars — 5 unique cubic Bezier arcs */}
      <WishingStarsCanvas isDark={isDark} />

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
        @media (prefers-reduced-motion: reduce) {
          .auth-cosmic-bg * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
