import { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// Two-step self-service account deletion:
//   1. Warning step — spells out exactly what happens (permanent, listings
//      removed, messages anonymized) before the destructive path is even
//      reachable.
//   2. Type-to-confirm step — the Delete button stays disabled until the
//      user types "DELETE" exactly. Admin accounts get one more field
//      (their own email) since accidentally nuking an admin account needs
//      more friction than a normal user.
export default function DeleteAccountModal({ open, onOpenChange }) {
  const { user, deleteAccount } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState("warning"); // "warning" | "confirm"
  const [confirmText, setConfirmText] = useState("");
  const [adminEmailText, setAdminEmailText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdminAccount = !!(user?.is_admin || user?.access_status === "ADMIN");

  const resetAndClose = () => {
    setStep("warning");
    setConfirmText("");
    setAdminEmailText("");
    onOpenChange(false);
  };

  const canConfirm =
    confirmText === "DELETE" &&
    (!isAdminAccount || adminEmailText.trim().toLowerCase() === user?.email?.toLowerCase());

  const handleDelete = async () => {
    if (!canConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAccount(confirmText, isAdminAccount ? adminEmailText.trim() : undefined);
      toast({ title: t("accountDeletedTitle", "Account deleted") });
      setLocation("/");
    } catch (err) {
      toast({
        title: t("accountDeleteFailedTitle", "Could not delete account"),
        description: err.message,
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? resetAndClose() : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md" data-testid="modal-delete-account">
        {step === "warning" ? (
          <>
            <DialogHeader>
              <div className="mx-auto sm:mx-0 mb-2 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle>{t("deleteAccountTitle", "Delete your account")}</DialogTitle>
              <DialogDescription>
                {t("deleteAccountWarningIntro", "This action is permanent and cannot be undone.")}
              </DialogDescription>
            </DialogHeader>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1.5">
              <li>{t("deleteAccountWarnPermanent", "Your account cannot be recovered once deleted.")}</li>
              <li>{t("deleteAccountWarnListings", "All of your listings will be removed.")}</li>
              <li>{t("deleteAccountWarnMessages", "Your messages may be anonymized, but existing conversations will remain intact for the other person.")}</li>
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} data-testid="button-cancel-delete-warning">
                {t("cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => setStep("confirm")}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-continue-delete"
              >
                {t("deleteAccountContinue", "Delete account")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("deleteAccountConfirmTitle", "Confirm deletion")}</DialogTitle>
              <DialogDescription>
                {t("deleteAccountTypeDelete", 'Type "DELETE" below to confirm.')}
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-testid="input-confirm-delete-text"
            />
            {isAdminAccount && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {t("deleteAccountAdminWarning", "This is an admin account. Type its email address to confirm.")}
                </p>
                <Input
                  value={adminEmailText}
                  onChange={(e) => setAdminEmailText(e.target.value)}
                  placeholder={user?.email}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  data-testid="input-confirm-admin-email"
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} data-testid="button-cancel-delete-confirm">
                {t("cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                disabled={!canConfirm || isDeleting}
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                data-testid="button-confirm-delete"
              >
                {isDeleting ? t("deleting", "Deleting…") : t("deleteAccountConfirmButton", "Permanently delete")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
