---
name: Kosmeo rental listing fields
description: How rental-specific fields (deposit, duration, size, delivery) are scoped so sale/commission listings stay unaffected.
---

Rental-only listing fields (deposit_amount, rental_duration(+custom), height_range, measurements, shoe_size, included_items[], care_instructions, delivery_method, damage_policy) live as nullable columns directly on `listings`, not a separate table — reuses the existing `is_for_rent` boolean as the gate.

**Why:** the existing `size`/`condition` columns were already on `listings` but unused by the frontend; extending the same table (rather than a join) kept `SELECT l.*` queries (listing feed, detail, /me) working with zero changes.

**How to apply:** both the zod schema in `server/routes/listings.js` (`.refine()` chain) and the INSERT in the same POST handler force all rental-only columns to `null`/`[]` when `is_for_rent` is false — never trust the request body alone, or toggling rent off/on could resurrect stale rental data. Frontend mirrors the same required set (deposit, duration, delivery method) with inline field errors + scroll-to-first-invalid, matching the priceErrors/listingTypeError pattern already used for price/listing-type validation in `src/pages/Sell.jsx`.

Also fixed in passing: `location` (the CityPicker city field) was collected on the Sell form but had no column and no schema key — zod silently stripped it before every insert. Added `listings.location` column + schema key.

Node backend does not hot-reload — restart the `Start application` workflow after editing anything under `server/`, HMR only covers the Vite frontend.
