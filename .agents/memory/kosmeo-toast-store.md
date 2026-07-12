---
name: Kosmeo toast notifications
description: Why toast() calls appeared to do nothing (validation warnings, errors) despite correct guard-clause logic.
---

`src/hooks/use-toast.js` originally created a fresh `useState([])` per call, so any component calling `toast()` (e.g. a form's validation guard) updated a toast list that `<Toaster />` — which calls `useToast()` itself — never saw. Guard clauses fired correctly but were visually silent everywhere in the app, not just one form.

**Why:** shadcn's real `use-toast` pattern requires a shared/module-level store + listener subscription; this repo's copy dropped that part.

**How to apply:** if a user reports "clicking X does nothing" and the code already has a toast()/guard clause that should fire, check `use-toast.js` uses a module-level `toasts`/`listeners` store (not local `useState`) before assuming the guard logic itself is wrong.
