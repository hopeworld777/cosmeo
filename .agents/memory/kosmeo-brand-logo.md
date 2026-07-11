---
name: Cosmeo brand logo (moon/star mark)
description: The real established logo is a moon+star neon mark; it only exists as PNG, and WaitlistLanding is off-limits for brand-mark rework.
---

- The current brand mark is a purple-to-pink neon crescent-moon + star + orbit-ring icon (`public/logo.png`, `logo-v2.png`, `waitlist-logo*.png`). An older needle-and-thread design also sits in `public/logo.svg`/`logo-dark.svg` but is **not** the active brand — don't reach for those without confirming with the user first.
- No SVG of the moon/star mark existed. When gradient-recoloring/scaling it was needed, it was vectorized via `potrace` (alpha-channel threshold → `-negate` → potrace) into `public/logo-mark.svg`, then inlined as a React component (`src/components/BrandMark.jsx`) with a `<linearGradient>` (`hsl(var(--primary))` → `hsl(var(--secondary))`) so it always tracks the site's brand gradient instead of the flat colors baked into the raster asset.
- **Why exclude `WaitlistLanding.jsx` from brand-mark rework:** the user explicitly asked to leave the pre-launch waitlist page untouched during a rebrand pass; it keeps using the raw `waitlist-logo-v2.png` image rather than `BrandMark`. Don't "helpfully" unify it without asking again.
