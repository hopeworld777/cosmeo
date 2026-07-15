---
name: Form field error border approach
description: Why all validated fields use inset box-shadow, not border-color/outline/external box-shadow
---

## Rule
All `[aria-invalid="true"]` error styling uses `box-shadow: inset 0 0 0 2px hsl(var(--error) / 0.70)`.

**Why:**
- Every field in Sell.jsx and Settings.jsx uses `border-none` — `border-color` changes are invisible.
- Price/rent inputs in Sell.jsx are inside `<motion.div className="overflow-hidden">`. Chrome clips both `outline` and external `box-shadow` at that `overflow: hidden` boundary.
- `inset` box-shadow paints INSIDE the element's own paint layer — it is never clipped by any parent container, follows `border-radius` exactly, and requires no `border` to be present.

**How to apply:**
- Place the rule unlayered in `index.css` (outside `@layer`) so it beats all Tailwind layers.
- Zero out `--tw-ring-offset-shadow` and `--tw-ring-shadow` in the same rule to prevent Tailwind CSS-var ring composition from leaking through.
- `aria-invalid` is placed directly on the `<input>`, `<select>`, or `<textarea>` element — NOT on any wrapper div.
- Auth forms (`authStyles.js`) use a separate inline-style path with real borders + external box-shadow glow — those are fine since their containers don't use `overflow: hidden`.
- `Input` and `SelectTrigger` components have `ring-offset-2` and `ring-offset-background` removed — they created an opaque background-colored gap directly outside the border that visually broke the error ring at corners.
