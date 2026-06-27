import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Flag, CheckCircle2, XCircle, AlertTriangle,
  Ban, UserX, ChevronDown, ChevronUp, ExternalLink,
  MessageSquare, Package, RefreshCw, Filter, Clock
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
  open:     { label: "Pending",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 border-green-200" },
  ignored:  { label: "Ignored",  color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const REASON_LABELS = {
  report_reason_scam:         "Scam",
  report_reason_fake_listing: "Fake listing",
  report_reason_offplatform:  "Off-platform deal",
  report_reason_harassment:   "Harassment",
  report_reason_counterfeit:  "Counterfeit item",
  report_reason_other:        "Other",
};

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Avatar({ username, avatarUrl, size = "h-8 w-8" }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className={`${size} rounded-full object-cover`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-xs`}>
      {username?.charAt(0).toUpperCase()}
    </div>
  );
}

function ReportCard({ report, onUpdate }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(null);

  async function act(action) {
    setBusy(action);
    try {
      if (action === "resolve") {
        await api.admin.updateReport(report.id, { status: "resolved" });
        toast({ title: "Report resolved" });
        onUpdate(report.id, { status: "resolved" });
      } else if (action === "ignore") {
        await api.admin.updateReport(report.id, { status: "ignored" });
        toast({ title: "Report ignored" });
        onUpdate(report.id, { status: "ignored" });
      } else if (action === "warn") {
        const res = await api.admin.warnUser(report.reported_id);
        toast({ title: `Warning issued — ${res.user.username} now has ${res.user.warning_count} warning(s)` });
        onUpdate(report.id, { reported_warning_count: res.user.warning_count });
      } else if (action === "suspend") {
        await api.admin.suspendUser(report.reported_id);
        toast({ title: `${report.reported_username} suspended` });
        onUpdate(report.id, { reported_is_banned: true });
      } else if (action === "ban") {
        await api.admin.banUser(report.reported_id);
        toast({ title: `${report.reported_username} permanently banned` });
        onUpdate(report.id, { reported_is_banned: true });
      } else if (action === "unban") {
        await api.admin.unbanUser(report.reported_id);
        toast({ title: `${report.reported_username} unbanned` });
        onUpdate(report.id, { reported_is_banned: false });
      }
    } catch (err) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
  const reasonLabel = REASON_LABELS[report.reason] || report.reason;
  const isPending = report.status === "open";

  return (
    <div className={`bg-white rounded-2xl border transition-all ${expanded ? "border-primary/30 shadow-md" : "border-border/40 hover:border-border/70"}`}>
      {/* ── Summary row (always visible) ── */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded(v => !v)}
        data-testid={`button-expand-report-${report.id}`}
      >
        {/* Reported user avatar */}
        <Avatar username={report.reported_username} avatarUrl={report.reported_avatar} size="h-10 w-10" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[14px] text-foreground">
              @{report.reported_username}
            </span>
            {report.reported_is_banned && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">BANNED</span>
            )}
            <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 font-medium">
            <span className="font-bold text-foreground/70">{reasonLabel}</span>
            {report.detail && <> · {report.detail.length > 60 ? report.detail.slice(0, 60) + "…" : report.detail}</>}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Reported by @{report.reporter_username} · {formatDate(report.created_at)}
          </p>
        </div>

        <div className="shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Expanded details ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/20 pt-3 flex flex-col gap-4">

              {/* People */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Reporter</p>
                  <div className="flex items-center gap-2">
                    <Avatar username={report.reporter_username} avatarUrl={report.reporter_avatar} size="h-7 w-7" />
                    <Link href={`/profile?id=${report.reporter_id}`}>
                      <span className="text-[13px] font-bold text-primary hover:underline cursor-pointer">
                        @{report.reporter_username}
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Reported user</p>
                  <div className="flex items-center gap-2">
                    <Avatar username={report.reported_username} avatarUrl={report.reported_avatar} size="h-7 w-7" />
                    <Link href={`/profile?id=${report.reported_id}`}>
                      <span className="text-[13px] font-bold text-primary hover:underline cursor-pointer">
                        @{report.reported_username}
                      </span>
                    </Link>
                  </div>
                  {(report.reported_warning_count > 0) && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-1.5">
                      ⚠️ {report.reported_warning_count} prior warning(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Reason + detail */}
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Reason</p>
                <p className="text-[13px] font-bold text-foreground">{reasonLabel}</p>
                {report.detail && (
                  <>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Description</p>
                    <p className="text-[13px] text-foreground leading-relaxed">{report.detail}</p>
                  </>
                )}
              </div>

              {/* Linked items */}
              {(report.listing_id || report.conversation_id) && (
                <div className="flex gap-2 flex-wrap">
                  {report.listing_id && (
                    <Link href={`/item/${report.listing_id}`}>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer">
                        <Package size={13} />
                        {report.listing_title ? report.listing_title.slice(0, 30) : `Listing #${report.listing_id}`}
                        <ExternalLink size={11} />
                      </span>
                    </Link>
                  )}
                  {report.conversation_id && (
                    <Link href={`/chat/${report.conversation_id}`}>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold bg-purple-50 border border-purple-200 text-purple-600 px-3 py-1.5 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer">
                        <MessageSquare size={13} />
                        View conversation
                        <ExternalLink size={11} />
                      </span>
                    </Link>
                  )}
                </div>
              )}

              {/* Resolution info */}
              {!isPending && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-0.5">
                    {report.status === "resolved" ? "Resolved" : "Ignored"}
                    {report.reviewed_by_username && <> by @{report.reviewed_by_username}</>}
                  </p>
                  {report.reviewed_at && (
                    <p className="text-[11px] text-green-600">{formatDate(report.reviewed_at)}</p>
                  )}
                  {report.resolution_note && (
                    <p className="text-[12px] text-green-800 mt-1">{report.resolution_note}</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {/* Report status actions */}
                {isPending && (
                  <div className="flex gap-2">
                    <ActionBtn
                      icon={<CheckCircle2 size={14} />}
                      label="Resolve"
                      color="bg-green-500 hover:bg-green-600 text-white"
                      busy={busy === "resolve"}
                      onClick={() => act("resolve")}
                      testId={`button-resolve-${report.id}`}
                    />
                    <ActionBtn
                      icon={<XCircle size={14} />}
                      label="Ignore"
                      color="bg-slate-200 hover:bg-slate-300 text-slate-700"
                      busy={busy === "ignore"}
                      onClick={() => act("ignore")}
                      testId={`button-ignore-${report.id}`}
                    />
                  </div>
                )}

                {/* User moderation actions */}
                {report.reported_id && (
                  <div className="flex gap-2 flex-wrap">
                    <ActionBtn
                      icon={<AlertTriangle size={14} />}
                      label="Warn user"
                      color="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300"
                      busy={busy === "warn"}
                      onClick={() => act("warn")}
                      testId={`button-warn-${report.id}`}
                    />
                    {!report.reported_is_banned ? (
                      <>
                        <ActionBtn
                          icon={<UserX size={14} />}
                          label="Suspend"
                          color="bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300"
                          busy={busy === "suspend"}
                          onClick={() => act("suspend")}
                          testId={`button-suspend-${report.id}`}
                        />
                        <ActionBtn
                          icon={<Ban size={14} />}
                          label="Perm. ban"
                          color="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                          busy={busy === "ban"}
                          onClick={() => act("ban")}
                          testId={`button-ban-${report.id}`}
                        />
                      </>
                    ) : (
                      <ActionBtn
                        icon={<CheckCircle2 size={14} />}
                        label="Unban user"
                        color="bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
                        busy={busy === "unban"}
                        onClick={() => act("unban")}
                        testId={`button-unban-${report.id}`}
                      />
                    )}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({ icon, label, color, busy, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      disabled={!!busy}
      data-testid={testId}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-colors disabled:opacity-50 ${color}`}
    >
      {busy ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      {label}
    </button>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [reports, setReports]   = useState([]);
  const [reasons, setReasons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  // Guard — redirect non-admins immediately
  useEffect(() => {
    if (user && !user.is_admin) setLocation("/");
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (reasonFilter) params.reason = reasonFilter;
      const [reps, rsns] = await Promise.all([
        api.admin.reports(params),
        api.admin.reportReasons(),
      ]);
      setReports(reps);
      setReasons(rsns);
    } catch (err) {
      toast({ title: "Failed to load reports", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user?.is_admin) load(); }, [statusFilter, reasonFilter, user]);

  // Optimistic local update after an action
  function handleUpdate(reportId, patch) {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...patch } : r));
  }

  const pendingCount  = reports.filter(r => r.status === "open").length;
  const resolvedCount = reports.filter(r => r.status === "resolved").length;

  if (!user) return null;
  if (!user.is_admin) return null;

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── Header ── */}
      <div className="sticky top-0 md:top-16 z-30 bg-white border-b border-border/20 px-4 md:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Shield size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-[17px] font-black text-foreground">Admin · Moderation</h1>
            <p className="text-[11.5px] text-muted-foreground">
              {pendingCount} pending · {resolvedCount} resolved
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            data-testid="button-refresh-reports"
            className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-primary" : "text-muted-foreground"} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-5 flex flex-col gap-4">

        {/* ── Stats pills ── */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "All",      value: "",         count: reports.length,  icon: <Flag size={12} /> },
            { label: "Pending",  value: "open",     count: pendingCount,    icon: <Clock size={12} /> },
            { label: "Resolved", value: "resolved", count: resolvedCount,   icon: <CheckCircle2 size={12} /> },
            { label: "Ignored",  value: "ignored",  count: reports.filter(r => r.status === "ignored").length, icon: <XCircle size={12} /> },
          ].map(pill => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              data-testid={`filter-status-${pill.value || "all"}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold border transition-all ${
                statusFilter === pill.value
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-muted-foreground border-border/50 hover:border-border"
              }`}
            >
              {pill.icon}
              {pill.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${statusFilter === pill.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Reason filter ── */}
        {reasons.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-muted-foreground shrink-0" />
            <button
              onClick={() => setReasonFilter("")}
              data-testid="filter-reason-all"
              className={`text-[12px] font-bold px-2.5 py-1 rounded-lg border transition-all ${reasonFilter === "" ? "bg-primary/10 text-primary border-primary/30" : "bg-white text-muted-foreground border-border/50 hover:border-border"}`}
            >
              All reasons
            </button>
            {reasons.map(r => (
              <button
                key={r}
                onClick={() => setReasonFilter(r)}
                data-testid={`filter-reason-${r}`}
                className={`text-[12px] font-bold px-2.5 py-1 rounded-lg border transition-all ${reasonFilter === r ? "bg-primary/10 text-primary border-primary/30" : "bg-white text-muted-foreground border-border/50 hover:border-border"}`}
              >
                {REASON_LABELS[r] || r}
              </button>
            ))}
          </div>
        )}

        {/* ── Report list ── */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Flag size={36} className="text-muted-foreground/30 mb-3" />
            <p className="text-[14px] font-bold text-muted-foreground">No reports found</p>
            <p className="text-[12.5px] text-muted-foreground/60 mt-1">Try changing the filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map(r => (
              <ReportCard key={r.id} report={r} onUpdate={handleUpdate} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
