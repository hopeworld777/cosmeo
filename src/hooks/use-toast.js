import { useEffect, useState, useCallback } from "react";

// Shared, module-level toast store. `useToast()` is called from many
// independent components (forms, Toaster, etc.) — each call used to create
// its own isolated `useState`, so a toast() fired from e.g. Sell.jsx updated
// a state instance that <Toaster /> (which calls useToast() itself) never
// saw. Every validation warning routed through toast() would silently vanish
// even though the code path ran correctly. A single shared store + listener
// list ensures every subscriber (including Toaster) re-renders on any
// toast()/dismiss() call, regardless of which component instance triggered it.
let toastId = 0;
let toasts = [];
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

function addToast({ title, description, variant = "default" }) {
  const id = ++toastId;
  toasts = [...toasts, { id, title, description, variant }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
  return id;
}

function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const [state, setState] = useState(toasts);

  useEffect(() => {
    listeners.add(setState);
    // Pick up any toasts fired between initial render and effect mount.
    setState(toasts);
    return () => listeners.delete(setState);
  }, []);

  const toast = useCallback((opts) => addToast(opts), []);
  const dismiss = useCallback((id) => dismissToast(id), []);

  return { toast, toasts: state, dismiss };
}
