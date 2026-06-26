import { useParams, useLocation } from "wouter";
import { ChevronLeft, Send, Loader2, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [convMeta, setConvMeta] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await api.messages.sendMessage(id, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch (err) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const otherName = convMeta?.other_username || "Seller";
  const otherAvatar = convMeta?.other_avatar || null;
  const otherInitial = otherName.slice(0, 2).toUpperCase();
  const listingTitle = convMeta?.listing_title || "";

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="text-5xl mb-4">👋</div>
            <p className="font-bold text-foreground mb-1">Start the conversation</p>
            <p className="text-sm text-muted-foreground">Ask about availability, size, or shipping.</p>
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
                        weekday: "short",
                        month: "short",
                        day: "numeric",
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

      {/* Input Bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-border/20 px-4 pb-8 pt-3">
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
            disabled={sending}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center disabled:opacity-40 transition-opacity shadow-md"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
