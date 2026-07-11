import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Users, Package, Flag, Star, BadgeCheck, Trash2,
  CheckCircle2, XCircle, AlertTriangle, Ban, UserX, ChevronDown, ChevronUp,
  ExternalLink, MessageSquare, RefreshCw, Filter, Clock, LayoutGrid, Search,
  Mail, Lock, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";

const STATUS_CONFIG = {
  open:     { label: "მოთხოვნილია",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "მოგვარებულია", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ignored:  { label: "იგნორირებულია", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const REASON_LABELS = {
  report_reason_scam:         "თაღლითობა",
  report_reason_fake_listing: "ყალბი განცხადება",
  report_reason_offplatform:  "პლატფორმის გარეთ გარიგება",
  report_reason_harassment:   "შევიწროება",
  report_reason_counterfeit:  "საეჭვო ორიგინალურობა",
  report_reason_other:        "სხვა",
};

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Avatar({ username, avatarUrl, size = "h-9 w-9" }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className={`${size} rounded-full object-cover`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-xs shrink-0`}>
      {username?.charAt(0).toUpperCase()}
    </div>
  );
}

function ActionBtn({ icon, label, color, busy, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      disabled={!!busy}
      data-testid={testId}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all duration-200 disabled:opacity-50 active:scale-95 ${color}`}
    >
      {busy ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      {label}
    </button>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
    >
      <div className={`absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-15 blur-xl ${gradient} transition-opacity duration-300 group-hover:opacity-25`} />
      <div className="flex items-center justify-between mb-4">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${gradient} shadow-md`}>
          {icon}
        </div>
      </div>
      <p className="text-[12.5px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[28px] font-black text-foreground leading-none tabular-nums">{value}</p>
    </motion.div>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "overview",  label: "მიმოხილვა",     icon: LayoutGrid },
  { id: "listings",  label: "განცხადებები",  icon: Package },
  { id: "users",     label: "მომხმარებლები", icon: Users },
  { id: "reports",   label: "საჩივრები",     icon: Flag },
  { id: "waitlist",  label: "Waitlist",       icon: Mail },
];

/* ── Listings tab ─────────────────────────────────────────────────────── */
function ListingsTab({ toast }) {
  const [filter, setFilter] = useState("all");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await api.admin.listings({ filter });
      setListings(rows);
    } catch (err) {
      toast({ title: "ჩატვირთვა ვერ მოხერხდა", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function toggleFeature(listing) {
    setBusyId(listing.id + "-feature");
    try {
      const res = await api.admin.featureListing(listing.id);
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, is_featured: res.listing.is_featured } : l));
      toast({ title: res.listing.is_featured ? "დამატებულია გამორჩეულებში ✨" : "ამოღებულია გამორჩეულებიდან" });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function approve(listing) {
    setBusyId(listing.id + "-approve");
    try {
      await api.admin.approveListing(listing.id);
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: "active", is_active: true, is_flagged: false } : l));
      toast({ title: "დამტკიცებულია" });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(listing) {
    setBusyId(listing.id + "-delete");
    try {
      await api.admin.deleteListing(listing.id);
      setListings(prev => prev.filter(l => l.id !== listing.id));
      toast({ title: "განცხადება წაშლილია" });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: "all", label: "ყველა" },
          { id: "pending", label: "მოლოდინში" },
          { id: "reported", label: "საეჭვო" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold border transition-all duration-200 ${
              filter === f.id ? "bg-primary text-white border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto h-8 w-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin text-primary" : "text-muted-foreground"} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={36} className="text-muted-foreground/30 mb-3" />
          <p className="text-[14px] font-bold text-muted-foreground">განცხადება არ მოიძებნა</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map(l => (
            <div key={l.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 transition-all hover:border-primary/30">
              <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0">
                {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-[14px] text-foreground truncate">{l.title}</p>
                  {l.is_featured && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Star size={10} className="fill-amber-500 text-amber-500" /> გამორჩეული
                    </span>
                  )}
                  {l.is_flagged && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">დაფლაგირებული</span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                  @{l.seller_username}
                  {l.seller_is_banned && <span className="text-red-500 font-bold">(დაბლოკილი)</span>}
                  <span>· {formatDate(l.created_at)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ActionBtn
                  icon={<Star size={14} className={l.is_featured ? "fill-current" : ""} />}
                  label={l.is_featured ? "მოხსნა" : "გამორჩევა"}
                  color={l.is_featured ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300"}
                  busy={busyId === l.id + "-feature"}
                  onClick={() => toggleFeature(l)}
                  testId={`button-feature-${l.id}`}
                />
                {(l.status === "pending" || l.is_flagged) && (
                  <ActionBtn
                    icon={<CheckCircle2 size={14} />}
                    label="დამტკიცება"
                    color="bg-emerald-500 hover:bg-emerald-600 text-white"
                    busy={busyId === l.id + "-approve"}
                    onClick={() => approve(l)}
                    testId={`button-approve-listing-${l.id}`}
                  />
                )}
                <ActionBtn
                  icon={<Trash2 size={14} />}
                  label="წაშლა"
                  color="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                  busy={busyId === l.id + "-delete"}
                  onClick={() => remove(l)}
                  testId={`button-delete-listing-${l.id}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Users tab ────────────────────────────────────────────────────────── */
function UsersTab({ toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await api.admin.users(search ? { search } : {});
      setUsers(rows);
    } catch (err) {
      toast({ title: "ჩატვირთვა ვერ მოხერხდა", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function toggleVerify(u) {
    setBusyId(u.id + "-verify");
    try {
      const res = await api.admin.verifyUser(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_verified: res.user.is_verified } : x));
      toast({ title: res.user.is_verified ? `@${u.username} ვერიფიცირებულია 💗` : `@${u.username} ვერიფიკაცია მოხსნილია` });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function act(u, action) {
    setBusyId(u.id + "-" + action);
    try {
      let res;
      if (action === "warn") res = await api.admin.warnUser(u.id);
      else if (action === "suspend") res = await api.admin.suspendUser(u.id);
      else if (action === "ban") res = await api.admin.banUser(u.id);
      else if (action === "unban") res = await api.admin.unbanUser(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...res.user } : x));
      toast({ title: `@${u.username} — მოქმედება შესრულებულია` });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="მოძებნე მომხმარებელი სახელით ან ემეილით…"
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card border border-border text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-primary/25 transition-shadow"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={36} className="text-muted-foreground/30 mb-3" />
          <p className="text-[14px] font-bold text-muted-foreground">მომხმარებელი არ მოიძებნა</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map(u => (
            <div key={u.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 flex-wrap transition-all hover:border-primary/30">
              <Avatar username={u.username} avatarUrl={u.avatar_url} size="h-11 w-11" />
              <div className="flex-1 min-w-[140px]">
                <p className="font-extrabold text-[14px] text-foreground flex items-center gap-1.5">
                  @{u.username}
                  {u.is_verified && <VerifiedBadge size={15} />}
                  {u.is_admin && <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">ADMIN</span>}
                  {u.is_banned && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">დაბლოკილი</span>}
                </p>
                <p className="text-[11.5px] text-muted-foreground font-medium mt-0.5">
                  {u.email} · {u.listings_count} განცხადება · {u.warning_count} გაფრთხილება
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ActionBtn
                  icon={<BadgeCheck size={14} />}
                  label={u.is_verified ? "მოხსნა" : "ვერიფიკაცია"}
                  color={u.is_verified ? "bg-pink-500 hover:bg-pink-600 text-white" : "bg-pink-100 hover:bg-pink-200 text-pink-700 border border-pink-300"}
                  busy={busyId === u.id + "-verify"}
                  onClick={() => toggleVerify(u)}
                  testId={`button-verify-${u.id}`}
                />
                <ActionBtn
                  icon={<AlertTriangle size={14} />}
                  label="გაფრთხილება"
                  color="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300"
                  busy={busyId === u.id + "-warn"}
                  onClick={() => act(u, "warn")}
                  testId={`button-warn-user-${u.id}`}
                />
                {!u.is_banned ? (
                  <ActionBtn
                    icon={<Ban size={14} />}
                    label="დაბლოკვა"
                    color="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                    busy={busyId === u.id + "-ban"}
                    onClick={() => act(u, "ban")}
                    testId={`button-ban-user-${u.id}`}
                  />
                ) : (
                  <ActionBtn
                    icon={<CheckCircle2 size={14} />}
                    label="განბლოკვა"
                    color="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300"
                    busy={busyId === u.id + "-unban"}
                    onClick={() => act(u, "unban")}
                    testId={`button-unban-user-${u.id}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Quick moderation (overview) — reported / newly posted listings ─────── */
function QuickModerationTab({ toast }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [reported, pending] = await Promise.all([
        api.admin.listings({ filter: "reported" }),
        api.admin.listings({ filter: "pending" }),
      ]);
      const merged = [...reported, ...pending].filter(
        (l, i, arr) => arr.findIndex(x => x.id === l.id) === i
      );
      setListings(merged);
    } catch (err) {
      toast({ title: "ჩატვირთვა ვერ მოხერხდა", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(l) {
    setBusyId(l.id + "-approve");
    try {
      await api.admin.approveListing(l.id);
      setListings(prev => prev.filter(x => x.id !== l.id));
      toast({ title: "დამტკიცებულია" });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(l) {
    setBusyId(l.id + "-delete");
    try {
      await api.admin.deleteListing(l.id);
      setListings(prev => prev.filter(x => x.id !== l.id));
      toast({ title: "განცხადება წაშლილია" });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function warnSeller(l) {
    setBusyId(l.id + "-warn");
    try {
      const res = await api.admin.warnUser(l.seller_id);
      toast({ title: `გაფრთხილება გაცემულია — @${res.user.username}-ს ${res.user.warning_count} გაფრთხილება ჰყავს` });
    } catch (err) {
      toast({ title: "შეცდომა", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-black text-foreground">სასწრაფო მოდერაცია</h3>
        <button onClick={load} className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin text-primary" : "text-muted-foreground"} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}</div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-2xl">
          <ShieldCheck size={32} className="text-emerald-400 mb-3" />
          <p className="text-[14px] font-bold text-muted-foreground">ყველაფერი წმინდაა — მოსანახავი არაფერია</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map(l => (
            <div key={l.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 flex-wrap transition-all hover:border-primary/30">
              <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-[140px]">
                <p className="font-extrabold text-[13.5px] text-foreground truncate flex items-center gap-2">
                  {l.title}
                  {l.is_flagged && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">დაფლაგირებული</span>}
                  {l.status === "pending" && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">ახალი</span>}
                </p>
                <p className="text-[11.5px] text-muted-foreground font-medium mt-0.5">@{l.seller_username} · {formatDate(l.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ActionBtn icon={<CheckCircle2 size={14} />} label="დამტკიცება" color="bg-emerald-500 hover:bg-emerald-600 text-white" busy={busyId === l.id + "-approve"} onClick={() => approve(l)} testId={`button-quick-approve-${l.id}`} />
                <ActionBtn icon={<AlertTriangle size={14} />} label="გაფრთხილება" color="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300" busy={busyId === l.id + "-warn"} onClick={() => warnSeller(l)} testId={`button-quick-warn-${l.id}`} />
                <ActionBtn icon={<Trash2 size={14} />} label="წაშლა" color="bg-red-500 hover:bg-red-600 text-white" busy={busyId === l.id + "-delete"} onClick={() => remove(l)} testId={`button-quick-delete-${l.id}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reports tab (moderation queue) ──────────────────────────────────────── */
function ReportCard({ report, onUpdate }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(null);

  async function act(action) {
    setBusy(action);
    try {
      if (action === "resolve") {
        await api.admin.updateReport(report.id, { status: "resolved" });
        toast({ title: "საჩივარი მოგვარებულია" });
        onUpdate(report.id, { status: "resolved" });
      } else if (action === "ignore") {
        await api.admin.updateReport(report.id, { status: "ignored" });
        toast({ title: "საჩივარი იგნორირებულია" });
        onUpdate(report.id, { status: "ignored" });
      } else if (action === "warn") {
        const res = await api.admin.warnUser(report.reported_id);
        toast({ title: `გაფრთხილება გაცემულია — @${res.user.username}-ს ${res.user.warning_count} გაფრთხილება ჰყავს` });
        onUpdate(report.id, { reported_warning_count: res.user.warning_count });
      } else if (action === "ban") {
        await api.admin.banUser(report.reported_id);
        toast({ title: `@${report.reported_username} დაბლოკილია` });
        onUpdate(report.id, { reported_is_banned: true });
      } else if (action === "unban") {
        await api.admin.unbanUser(report.reported_id);
        toast({ title: `@${report.reported_username} განბლოკილია` });
        onUpdate(report.id, { reported_is_banned: false });
      }
    } catch (err) {
      toast({ title: "მოქმედება ჩავარდა", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
  const reasonLabel = REASON_LABELS[report.reason] || report.reason;
  const isPending = report.status === "open";

  return (
    <div className={`bg-card rounded-2xl border transition-all ${expanded ? "border-primary/40 shadow-md" : "border-border hover:border-primary/30"}`}>
      <button className="w-full text-left p-4 flex items-start gap-3" onClick={() => setExpanded(v => !v)} data-testid={`button-expand-report-${report.id}`}>
        <Avatar username={report.reported_username} avatarUrl={report.reported_avatar} size="h-10 w-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[14px] text-foreground">@{report.reported_username}</span>
            {report.reported_is_banned && <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">დაბლოკილი</span>}
            <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
          </div>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 font-medium">
            <span className="font-bold text-foreground/70">{reasonLabel}</span>
            {report.detail && <> · {report.detail.length > 60 ? report.detail.slice(0, 60) + "…" : report.detail}</>}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">მიმართა @{report.reporter_username} · {formatDate(report.created_at)}</p>
        </div>
        <div className="shrink-0 text-muted-foreground mt-0.5">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-4">
              {(report.listing_id || report.conversation_id) && (
                <div className="flex gap-2 flex-wrap">
                  {report.listing_id && (
                    <Link href={`/item/${report.listing_id}`}>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer">
                        <Package size={13} />{report.listing_title ? report.listing_title.slice(0, 30) : `განცხადება #${report.listing_id}`}<ExternalLink size={11} />
                      </span>
                    </Link>
                  )}
                  {report.conversation_id && (
                    <Link href={`/chat/${report.conversation_id}`}>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors cursor-pointer">
                        <MessageSquare size={13} />საუბრის ნახვა<ExternalLink size={11} />
                      </span>
                    </Link>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {isPending && (
                  <div className="flex gap-2 flex-wrap">
                    <ActionBtn icon={<CheckCircle2 size={14} />} label="დამტკიცება" color="bg-emerald-500 hover:bg-emerald-600 text-white" busy={busy === "resolve"} onClick={() => act("resolve")} testId={`button-resolve-${report.id}`} />
                    <ActionBtn icon={<Trash2 size={14} />} label="წაშლა" color="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300" busy={busy === "ban"} onClick={() => act("ban")} testId={`button-report-delete-${report.id}`} />
                    <ActionBtn icon={<AlertTriangle size={14} />} label="გაფრთხილება" color="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300" busy={busy === "warn"} onClick={() => act("warn")} testId={`button-report-warn-${report.id}`} />
                    <ActionBtn icon={<XCircle size={14} />} label="იგნორი" color="bg-slate-100 hover:bg-slate-200 text-slate-600" busy={busy === "ignore"} onClick={() => act("ignore")} testId={`button-ignore-${report.id}`} />
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

function ReportsTab() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [reps, rsns] = await Promise.all([api.admin.reports(params), api.admin.reportReasons()]);
      setReports(reps);
      setReasons(rsns);
    } catch (err) {
      toast({ title: "ჩატვირთვა ვერ მოხერხდა", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  function handleUpdate(reportId, patch) {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...patch } : r));
  }

  const pendingCount = reports.filter(r => r.status === "open").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "ყველა", value: "" },
          { label: "მოთხოვნილია", value: "open" },
          { label: "მოგვარებული", value: "resolved" },
          { label: "იგნორირებული", value: "ignored" },
        ].map(pill => (
          <button
            key={pill.value}
            onClick={() => setStatusFilter(pill.value)}
            className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold border transition-all duration-200 ${
              statusFilter === pill.value ? "bg-primary text-white border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Flag size={36} className="text-muted-foreground/30 mb-3" />
          <p className="text-[14px] font-bold text-muted-foreground">საჩივარი არ მოიძებნა</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map(r => <ReportCard key={r.id} report={r} onUpdate={handleUpdate} />)}
        </div>
      )}
    </div>
  );
}

/* ── Waitlist tab ────────────────────────────────────────────────────────── */
const SESSION_KEY = "cosmeo_admin_vip";

function WaitlistTab() {
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchWaitlist(c) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.waitlist(c);
      setRows(data);
      sessionStorage.setItem(SESSION_KEY, c);
      setCode(c);
    } catch (err) {
      setError(err.message);
      setCode("");
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }

  // Auto-load if code already stored
  useEffect(() => {
    if (code) fetchWaitlist(code);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (codeInput.trim()) fetchWaitlist(codeInput.trim());
  }

  /* ── Code gate ── */
  if (!code) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center py-20"
      >
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-border bg-[#FFFDF9] p-8 shadow-sm text-center">
            <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Lock size={22} className="text-white" />
            </div>
            <h2 className="text-[18px] font-black text-foreground mb-1">Waitlist Access</h2>
            <p className="text-[13px] text-muted-foreground mb-6">Enter your VIP code to view subscriber data.</p>
            {error && (
              <p className="text-[12px] font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mb-4">
                {error === "Unauthorized" ? "Wrong code — try again." : error}
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                placeholder="VIP code"
                autoFocus
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
              <button
                type="submit"
                disabled={!codeInput.trim() || loading}
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-[14px] font-bold text-white shadow-md shadow-violet-200 hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? "Checking…" : "Unlock"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Loaded view ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col gap-5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-[17px] font-black text-foreground leading-tight">Waitlist</h2>
            <p className="text-[12px] text-muted-foreground font-medium">Pre-launch signups</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Total badge */}
          <div className="flex items-center gap-2 rounded-2xl bg-[#FFFDF9] border border-violet-200 px-4 py-2.5 shadow-sm">
            <span className="text-[11px] font-bold text-violet-500 uppercase tracking-wide">Total Subscribers</span>
            <span className="text-[22px] font-black text-violet-600 leading-none tabular-nums">
              {loading ? "—" : rows.length}
            </span>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchWaitlist(code)}
            disabled={loading}
            className="h-10 w-10 rounded-xl border border-border bg-[#FFFDF9] flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-violet-300 transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Lock (clear code) */}
          <button
            onClick={() => { setCode(""); setRows([]); sessionStorage.removeItem(SESSION_KEY); }}
            className="h-10 w-10 rounded-xl border border-border bg-[#FFFDF9] flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:border-rose-200 transition-all active:scale-95"
            title="Lock"
          >
            <Lock size={15} />
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-border bg-[#FFFDF9] overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-[13px] font-medium gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
            <Mail size={28} className="opacity-30" />
            <p className="text-[13px] font-medium">No signups yet.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-border bg-white/60">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Signed up</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/60">
              {rows.map((row, i) => (
                <motion.div
                  key={row.id ?? row.email}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
                  className="grid grid-cols-[1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-violet-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-black">
                        {row.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[13.5px] font-semibold text-foreground truncate">{row.email}</span>
                  </div>
                  <span className="text-[12px] text-muted-foreground font-medium text-right whitespace-nowrap">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main dashboard ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user && !user.is_admin) setLocation("/");
  }, [user]);

  useEffect(() => {
    if (!user?.is_admin) return;
    api.admin.stats().then(setStats).catch(() => {});
  }, [user]);

  if (!user) return null;
  if (!user.is_admin) return null;

  return (
    <div className="min-h-full bg-background">

      {/* ── Header ── */}
      <div className="sticky top-0 md:top-16 z-30 bg-card/95 backdrop-blur-xl border-b border-border px-4 md:px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-[19px] font-black text-foreground tracking-tight">მართვის პანელი</h1>
            <p className="text-[12px] text-muted-foreground font-medium">მოგესალმებით, ადმინისტრატორო!</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon={<Users size={20} className="text-white" />}
            label="ქართველი კრეატორები"
            value={stats ? stats.totalUsers : "—"}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          />
          <KpiCard
            icon={<Package size={20} className="text-white" />}
            label="აქტიური განცხადებები"
            value={stats ? stats.activeListings : "—"}
            gradient="bg-gradient-to-br from-sky-500 to-blue-600"
            delay={0.05}
          />
          <KpiCard
            icon={<Flag size={20} className="text-white" />}
            label="საეჭვო განცხადებები"
            value={stats ? stats.openReports : "—"}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            delay={0.1}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 bg-muted/60 p-1.5 rounded-2xl w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`admin-tab-${id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                tab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === "overview"  && <QuickModerationTab toast={toast} />}
            {tab === "listings"  && <ListingsTab toast={toast} />}
            {tab === "users"     && <UsersTab toast={toast} />}
            {tab === "reports"   && <ReportsTab />}
            {tab === "waitlist"  && <WaitlistTab />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
