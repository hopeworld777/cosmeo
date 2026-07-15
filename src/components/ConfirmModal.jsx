import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

// Reusable Cosmeo confirmation modal — the app-wide replacement for
// window.confirm(). Matches the glassmorphism / gradient / rounded-corner
// language used across the rest of the app (see DeleteAccountModal,
// SellerReviewModal, ItemDetail chat sheet, etc.).
//
// Usage:
//   <ConfirmModal
//     open={confirmOpen}
//     variant="destructive"
//     title="Delete Listing?"
//     description="Are you sure you want to delete this listing? This action cannot be undone."
//     confirmLabel="Delete Listing"
//     icon={Trash2}
//     loading={isDeleting}
//     onCancel={() => setConfirmOpen(false)}
//     onConfirm={handleConfirmedDelete}
//   />
//
// For destructive actions, clicking the backdrop is disabled by default —
// pass `closeOnOutsideClick` to override.
export default function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "destructive", // "destructive" | "default"
  icon: Icon,
  loading = false,
  closeOnOutsideClick,
}) {
  const { t } = useTranslation();
  const confirmButtonRef = useRef(null);

  const isDestructive = variant === "destructive";
  // Destructive actions require an explicit choice — clicking outside is
  // disabled unless the caller opts in.
  const canCloseOnOutsideClick = closeOnOutsideClick ?? !isDestructive;
  const ResolvedIcon = Icon || (isDestructive ? Trash2 : AlertTriangle);

  // Esc → cancel, Enter → confirm. Both are ignored while a request is
  // already in flight so a double-Enter can't fire two deletes.
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (loading) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel, onConfirm]);

  useEffect(() => {
    if (open) confirmButtonRef.current?.focus();
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="confirm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              if (canCloseOnOutsideClick && !loading) onCancel?.();
            }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="confirm-modal-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby={description ? "confirm-modal-description" : undefined}
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border/40 bg-card/90 backdrop-blur-xl shadow-2xl p-6"
          >
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                isDestructive
                  ? "bg-gradient-to-br from-red-500/15 to-red-600/10 text-red-500"
                  : "bg-gradient-to-br from-primary/15 to-secondary/10 text-primary"
              }`}
            >
              <ResolvedIcon className="h-7 w-7" />
            </div>
            <h2 id="confirm-modal-title" className="text-center text-xl font-black text-foreground mb-1.5">
              {title}
            </h2>
            {description && (
              <p
                id="confirm-modal-description"
                className="text-center text-sm font-medium text-muted-foreground leading-relaxed mb-6"
              >
                {description}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { if (!loading) onCancel?.(); }}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl bg-muted text-foreground font-bold text-sm hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {cancelLabel || t("cancel", "Cancel")}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => { if (!loading) onConfirm?.(); }}
                disabled={loading}
                className={`flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:pointer-events-none ${
                  isDestructive
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90 shadow-[0_8px_20px_rgba(239,68,68,0.25)]"
                    : "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                }`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? t("processing", "Processing…") : (confirmLabel || t("confirm", "Confirm"))}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
