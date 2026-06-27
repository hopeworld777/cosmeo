import { useParams, useLocation, Link } from "wouter";
import {
  ChevronLeft, Send, Loader2, ShieldCheck,
  Flag, AlertTriangle, X, CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// ─── Keyword → warning key map ────────────────────────────────────────────────
const KEYWORD_RULES = [
  {
    patterns: /გადმო?ვ?ი?ც?ხ?ო?ვ?|transfer|გადარიცხ|გადახდ|გადაიხად|bank|ბანკ|card|ბარათ|crypto|крипто/i,
    warnKey: "chatWarn_transfer",
  },
  {
    patterns: /ship|shipped|shipping|გამო?გ?ზ?ა?ვ?ნ|courier|კურიერ|post|ფოსტ|delivery|მიტანა/i,
    warnKey: "chatWarn_shipping",
  },
  {
    patterns: /telegram|whatsapp|viber|signal|instagram|dm me|dm you|პირად|პირადად|move.*chat|chat.*move/i,
    warnKey: "chatWarn_offplatform",
  },
  {
    patterns: /deposit|დეპოზიტ|advance|წინასწარ|advance.*pay|pay.*advance|reserve.*pay/i,
    warnKey: "chatWarn_deposit",
  },
];

function detectWarning(text) {
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.test(text)) return rule.warnKey;
  }
  return null;
}

// ─── Inline safety banner ─────────────────────────────────────────────────────
function SafetyBanner({ warnKey, onDismiss }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {warnKey && (
        <motion.div
          key={warnKey}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="mx-4 mb-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2.5 shadow-sm"
        >
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] leading-snug text-amber-800 font-medium">
              {t(warnKey)}
            </p>
            <Link href="/terms">
              <span className="text-[11.5px] font-bold text-amber-600 hover:text-amber-800 transition-colors underline underline-offset-2 mt-0.5 inline-block">
                {t("chatSafetyLearnMore")} →
              </span>
            </Link>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Report dialog (centered modal) ──────────────────────────────────────────
const REPORT_REASONS = [
  "report_reason_scam",
  "report_reason_fake_listing",
  "report_reason_offplatform",
  "report_reason_harassment",
  "report_reason_counterfeit",
  "report_reason_other",
];

function ReportSheet({ open, onClose, conversationId, reportedUserId, listingId }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState("pick");
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (open) { setStep("pick"); setReason(null); setDetail(""); }
  }, [open]);

  // Prevent the page behind from scrolling while the dialog is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  async function submit() {
    setSubmitting(true);
    try {
      await api.reports.create({
        reported_user_id: reportedUserId,
        listing_id: listingId,
        conversation_id: conversationId,
        reason,
        detail: detail.trim(),
      });
      setStep("done");
    } catch (err) {
      toast({ title: t("report_error"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        /*
         * Full-viewport overlay — this is the flex container that does the
         * centering.  z-[200] ensures it sits above the app shell's stacking
         * context (which uses z-[80] for the desktop nav and z-30 for chat
         * header).  Padding respects iPhone safe-area insets on all four sides
         * so the modal card is never hidden behind the notch or home indicator.
         */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
          style={{
            paddingTop:    "env(safe-area-inset-top,    16px)",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
            paddingLeft:   "env(safe-area-inset-left,   16px)",
            paddingRight:  "env(safe-area-inset-right,  16px)",
          }}
          onClick={onClose}
        >
          {/*
           * Modal card — stopPropagation keeps clicks inside from closing the
           * dialog.  max-h + overflow-y-auto makes long content scroll rather
           * than overflow off-screen.  16px horizontal margin keeps it away
           * from the screen edges on narrow phones.
           */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.95, y: 16  }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-full max-w-sm bg-background rounded-3xl shadow-2xl flex flex-col mx-4"
            style={{ maxHeight: "90dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable body */}
            <div className="overflow-y-auto overscroll-contain flex-1">

              {step === "pick" && (
                <div className="px-5 pt-5 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-extrabold text-[17px]">{t("report_sheet_title")}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted">
                      <X size={18} className="text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-[13px] text-muted-foreground mb-4">{t("report_sheet_subtitle")}</p>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((rk) => (
                      <button
                        key={rk}
                        onClick={() => { setReason(rk); setStep("detail"); }}
                        className="w-full text-left px-4 py-3 rounded-2xl border border-border/60 bg-muted/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-[13.5px] font-semibold"
                      >
                        {t(rk)}
                      </button>
                    ))}
                  </div>
                  {/* Cancel button always visible at the bottom */}
                  <button
                    onClick={onClose}
                    className="mt-4 w-full py-3 rounded-2xl bg-muted text-muted-foreground font-bold text-[13.5px] hover:bg-muted/80 transition-colors"
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                </div>
              )}

              {step === "detail" && (
                <div className="px-5 pt-5 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setStep("pick")} className="p-1.5 rounded-xl hover:bg-muted">
                      <ChevronLeft size={18} className="text-muted-foreground" />
                    </button>
                    <h2 className="font-extrabold text-[17px]">{t("report_detail_title")}</h2>
                  </div>
                  <div className="rounded-2xl bg-primary/8 border border-primary/20 px-3 py-2 mb-4 text-[12.5px] text-primary font-semibold">
                    {t(reason)}
                  </div>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder={t("report_detail_placeholder")}
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-2xl border border-border/60 bg-muted/50 px-4 py-3 text-[13.5px] resize-none outline-none focus:border-primary/50 transition-colors"
                  />
                  <p className="text-right text-[11px] text-muted-foreground mt-1">{detail.length}/500</p>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="mt-3 w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-[14px] disabled:opacity-50 transition-opacity shadow-md"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        {t("report_submitting")}
                      </span>
                    ) : t("report_submit_btn")}
                  </button>
                  <p className="text-center text-[11.5px] text-muted-foreground mt-3">
                    {t("report_privacy_note")}
                  </p>
                </div>
              )}

              {step === "done" && (
                <div className="px-5 pt-8 pb-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-primary" />
                  </div>
                  <h2 className="font-extrabold text-[18px] mb-2">{t("report_done_title")}</h2>
                  <p className="text-[13.5px] text-muted-foreground max-w-[280px] leading-relaxed">
                    {t("report_done_desc")}
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-8 py-3 rounded-2xl bg-muted font-bold text-[14px]"
                  >
                    {t("report_done_close")}
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Chat page ───────────────────────────────────────────────────────────
export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [convMeta, setConvMeta] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Warning + report state
  const [activeWarn, setActiveWarn] = useState(null);
  const [dismissedWarns, setDismissedWarns] = useState(new Set());
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => { loadMessages(); }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadMessages() {
    try {
      setLoading(true);
      const msgs = await api.messages.getMessages(id);
      setMessages(msgs || []);
      const convs = await api.messages.conversations();
      const meta = (convs || []).find((c) => String(c.id) === String(id));
      setConvMeta(meta || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Keyword scanner — fires on every keystroke
  const handleTextChange = useCallback((e) => {
    const val = e.target.value;
    setText(val);
    const warnKey = detectWarning(val);
    if (warnKey && !dismissedWarns.has(warnKey)) {
      setActiveWarn(warnKey);
    } else if (!warnKey) {
      setActiveWarn(null);
    }
  }, [dismissedWarns]);

  function dismissWarn() {
    setDismissedWarns((prev) => new Set(prev).add(activeWarn));
    setActiveWarn(null);
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await api.messages.sendMessage(id, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText("");
      setActiveWarn(null);
    } catch (err) {
      toast({ title: t("failedToSend"), description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const otherName    = convMeta?.other_username || t("seller");
  const otherAvatar  = convMeta?.other_avatar   || null;
  const otherInitial = otherName.slice(0, 2).toUpperCase();
  const listingTitle = convMeta?.listing_title  || "";
  const otherUserId  = convMeta?.other_user_id  || null;
  const listingId    = convMeta?.listing_id     || null;

  const formatTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-border/20 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/messages")}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>

          <Avatar className="h-11 w-11 border-2 border-primary/20 shrink-0">
            <AvatarImage src={otherAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-black">{otherInitial}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-foreground leading-tight truncate">{otherName}</p>
            {listingTitle && (
              <p className="text-xs text-primary font-bold truncate">{listingTitle}</p>
            )}
          </div>

          {/* Report button */}
          <button
            onClick={() => setReportOpen(true)}
            className="h-9 w-9 bg-muted rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
            aria-label={t("report_btn_label")}
            title={t("report_btn_label")}
          >
            <Flag className="h-4 w-4 text-muted-foreground hover:text-red-500" />
          </button>

          <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="text-5xl mb-4">👋</div>
            <p className="font-bold text-foreground mb-1">{t("startConversation")}</p>
            <p className="text-sm text-muted-foreground">{t("chatStartHint")}</p>
          </motion.div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id;
            const showDate =
              i === 0 ||
              new Date(msg.created_at).toDateString() !==
                new Date(messages[i - 1]?.created_at).toDateString();
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString([], {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {!isMine && (
                    <Avatar className="h-7 w-7 border border-border/50 shrink-0 mb-1">
                      <AvatarImage src={msg.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">
                        {(msg.username || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-snug ${
                        isMine
                          ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium px-1">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Safety banner — sits just above the input bar */}
      <SafetyBanner warnKey={activeWarn} onDismiss={dismissWarn} />

      {/* Input Bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-border/20 px-4 pb-8 pt-3">
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
            disabled={sending}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center disabled:opacity-40 transition-opacity shadow-md"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </motion.button>
        </div>
      </div>

      {/* Report sheet */}
      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        conversationId={id}
        reportedUserId={otherUserId}
        listingId={listingId}
      />
    </div>
  );
}
