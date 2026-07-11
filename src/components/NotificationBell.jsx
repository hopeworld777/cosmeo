import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// Localized message field for the current language, falling back to English.
function localizedMessage(n, lang) {
  if (lang?.startsWith("ka")) return n.message_ka || n.message_en;
  return n.message_en || n.message_ka;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  // Set of notification IDs currently animating out
  const [dismissing, setDismissing] = useState(new Set());
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await api.notifications.list();
      setNotifications(rows);
    } catch {
      // silent — notifications are non-critical
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleNotificationClick(n) {
    if (!n.is_read) {
      try {
        await api.notifications.markRead(n.id);
        setNotifications((prev) =>
          prev.map((row) => (row.id === n.id ? { ...row, is_read: true } : row))
        );
      } catch {
        // ignore — non-critical
      }
    }
  }

  async function handleDismiss(e, id) {
    // Stop the click from bubbling up to the row's mark-read handler
    e.stopPropagation();

    // Kick off the fade-out animation
    setDismissing((prev) => new Set(prev).add(id));

    // Wait for the CSS transition to finish, then remove from state
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);

    // Fire-and-forget API call — non-critical
    try {
      await api.notifications.dismiss(id);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notifications")}
        data-testid="button-notification-bell"
        className="relative h-[34px] w-[34px] rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(236,72,153,0.8)]"
            data-testid="badge-unread-count"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-80 max-w-[90vw] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden z-[100]"
          data-testid="dropdown-notifications"
        >
          <div className="px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-bold text-white">{t("notifications")}</span>
          </div>
          <div className="max-h-96 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                {t("notificationsEmpty")}
              </div>
            ) : (
              notifications.map((n) => {
                const isDismissing = dismissing.has(n.id);
                return (
                  <div
                    key={n.id}
                    data-testid={`notification-item-${n.id}`}
                    // Animate out: collapse height + fade opacity
                    style={{ maxHeight: isDismissing ? "0px" : "128px" }}
                    className={[
                      "relative group overflow-hidden",
                      "transition-[opacity,max-height] duration-300 ease-in-out",
                      isDismissing ? "opacity-0" : "opacity-100",
                    ].join(" ")}
                  >
                    {/* Main row — acts as the mark-read trigger */}
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-800/60 ${
                        !n.is_read ? "bg-zinc-800/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pink-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                              {t(`notif_${n.type}`, { defaultValue: n.type })}
                            </span>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          <p className="text-[13px] text-zinc-200 leading-snug mt-0.5 pr-4">
                            {localizedMessage(n, i18n.language)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Dismiss (X) button — top-right, revealed on group hover */}
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      onClick={(e) => handleDismiss(e, n.id)}
                      className={[
                        "absolute top-2 right-2 z-10",
                        "h-5 w-5 rounded-full flex items-center justify-center",
                        "bg-zinc-700/70 hover:bg-red-500/80",
                        "text-zinc-400 hover:text-white",
                        "transition-all duration-150",
                        // Hidden until the row is hovered
                        "opacity-0 group-hover:opacity-100",
                        "scale-75 group-hover:scale-100",
                      ].join(" ")}
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
