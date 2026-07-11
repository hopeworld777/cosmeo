import { useId } from "react";
import { MoonStar } from "lucide-react";

/**
 * Flat vector brand mark — crescent moon + sparkle, rendered with the
 * site's signature purple → pink gradient (matches AuthLayout / WaitlistLanding).
 *
 * Replaces the raw uploaded logo image: it's a real transparent SVG, so it
 * sits natively on any background (navbar, cards, dark or light theme)
 * with no background box or color mismatch.
 */
export default function BrandMark({ size = 26, strokeWidth = 1.75, className = "" }) {
  const gradientId = useId();

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>
      <MoonStar
        width={size}
        height={size}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        aria-hidden="true"
      />
    </span>
  );
}
