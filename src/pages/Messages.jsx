import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function Messages() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchConversations() {
      try {
        const data = await api.messages.conversations();
        setConversations(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.other_username || "").toLowerCase().includes(q) ||
      (c.listing_title || "").toLowerCase().includes(q) ||
      (c.last_message || "").toLowerCase().includes(q)
    );
  });

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-5 px-4 rounded-b-3xl shadow-sm">
        <h1 className="text-3xl font-black mb-5 text-foreground">Inbox</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
          <Input
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 bg-muted border-none h-14 rounded-2xl text-base font-medium placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-4 pt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 w-full bg-muted rounded-3xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-9 w-9 text-primary" />
            </div>
            <p className="font-extrabold text-foreground text-xl mb-2">
              {search ? t("noResults") : t("noMessages").split(".")[0]}
            </p>
            <p className="text-sm text-muted-foreground max-w-[220px]">
              {search ? t("tryDifferentSearch") : t("noMessages").split(". ").slice(1).join(". ")}
            </p>
            {!search && (
              <Link href="/browse">
                <button className="mt-5 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity">
                  Browse Listings
                </button>
              </Link>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((chat, i) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/chat/${chat.id}`}>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-3xl card-shadow hover:-translate-y-0.5 transition-transform cursor-pointer group active:scale-[0.98]">

                    {/* Avatar with unread dot */}
                    <div className="relative shrink-0">
                      <Avatar className="h-16 w-16 border-2 border-primary/15 shadow-sm">
                        <AvatarImage src={chat.other_avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">
                          {chat.other_username ? chat.other_username.slice(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      {chat.unread_count > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary border-2 border-white flex items-center justify-center">
                          <span className="text-[9px] font-black text-white">{chat.unread_count}</span>
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-extrabold text-foreground text-base truncate ${chat.unread_count ? "text-foreground" : ""}`}>
                          {chat.other_username}
                        </h3>
                        <span className="text-[11px] font-bold text-muted-foreground shrink-0 ml-2">
                          {formatTime(chat.last_message_at)}
                        </span>
                      </div>
                      {chat.listing_title && (
                        <p className="text-[11px] font-bold text-primary mb-1 truncate">{chat.listing_title}</p>
                      )}
                      <p className={`text-sm line-clamp-1 ${chat.unread_count ? "text-foreground font-bold" : "text-muted-foreground font-medium"}`}>
                        {chat.last_message || "No messages yet"}
                      </p>
                    </div>

                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
