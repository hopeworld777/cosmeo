import { useId } from "react";

/**
 * Cosmeo brand mark — the needle + thread + sparkle icon, rendered inline as
 * SVG so it always inherits the site's purple-to-pink brand gradient
 * (hsl(var(--primary)) -> hsl(var(--secondary))) instead of a flat/static
 * color baked into a raster asset. Fully transparent background.
 *
 * Usage: <BrandMark className="h-12 w-12" />
 */
export default function BrandMark({ className = "h-10 w-10", title = "Cosmeo" }) {
  const reactId = useId();
  const gradientId = `brandmark-gradient-${reactId}`;

  return (
    <svg
      viewBox="0 0 160 220"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>

      {/* Needle body */}
      <path
        d="M 35 185
           L 86.7 44.1
           C 87.5 37, 82 34, 80 34
           C 78 34, 72.5 37, 73.3 39.9
           Z"
        fill={`url(#${gradientId})`}
      />

      {/* Eye hole */}
      <ellipse cx="80" cy="53" rx="4" ry="7" transform="rotate(-17 80 53)" fill="white" />

      {/* Thread S-curve */}
      <path
        d="M 86 58
           C 124 70, 112 130, 90 158
           C 68 186, 104 193, 90 196"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Sparkle */}
      <path
        d="M 90 196
           Q 95 213, 110 216
           Q 95 219,  90 236
           Q 85 219,  70 216
           Q 85 213,  90 196 Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
