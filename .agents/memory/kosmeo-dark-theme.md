---
name: Cosmeo dark/light theme system
description: How theming is wired — CSS var architecture, toggle placement, default, and the one page intentionally excluded.
---

- Theme toggling uses Tailwind's `darkMode: ["class"]` (already configured) + a `.dark` block in `src/index.css` overriding the same CSS var names as `:root` (background/card/primary/etc). Any component using semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-muted`, `bg-primary`...) auto-adapts — no per-component dark: variants needed.
- State lives in `src/context/ThemeContext.jsx` (`useTheme()`), persisted to `localStorage["kosmeo_theme"]`, default **dark**. `index.html` has a blocking inline script that applies the class pre-paint to avoid flash — keep it in sync if the storage key or default ever changes.
- Toggle UI is `src/components/ThemeToggle.jsx`, mounted in 3 places: desktop `DesktopNav` (App.jsx), mobile `HeaderControls.jsx` (shared by Home/Browse/Messages/Wishlist), and `Settings.jsx` header. Add it to new headers the same way if they need it.
- **WaitlistLanding.jsx is now theme-aware:** it has its own `DARK`/`LIGHT` token objects (not Tailwind semantic tokens) and reads `useTheme()` directly. Background, text, badge, and ring colors all switch. The Framer Motion `animate={{ background }}` transition smooths the switch. The purple-to-pink CTA button and sparkle colors are unchanged across both themes.
- Most `bg-white` → `bg-card` swaps were done across headers/cards app-wide so dark mode isn't just cosmetic on the toggle's own screen. A few `bg-white/NN` instances were deliberately left alone: decorative glass overlays on already-colored/gradient hero banners (AuthLayout, RestrictedScreen, Profile stats banner) and toggle-switch knobs (Sell.jsx) — those aren't theme surfaces.
