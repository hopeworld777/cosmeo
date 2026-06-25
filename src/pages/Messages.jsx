import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-5 px-4 rounded-b-3xl shadow-sm">
        <h1 className="text-3xl font-black mb-5 text-foreground">Inbox</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <Input 
            placeholder="Search messages..." 
            className="pl-12 bg-muted border-none h-14 rounded-2xl text-base font-medium placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      <div className="flex-1 p-4 pt-6 space-y-4">
        {loading ? (
           Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="h-24 w-full bg-muted rounded-3xl animate-pulse" />
           ))
        ) : conversations.length === 0 ? (
           <div className="text-center text-muted-foreground font-medium py-10">No messages yet.</div>
        ) : (
          conversations.map((chat) => (
            <Link key={chat.id} href="#">
              <div className="flex items-center gap-4 p-5 bg-white rounded-3xl card-shadow hover:-translate-y-1 transition-transform cursor-pointer group">
                <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
                  <AvatarImage src={chat.other_avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">{chat.other_username ? chat.other_username.slice(0,2).toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1.5">
                    <h3 className="font-extrabold text-foreground text-lg">{chat.other_username}</h3>
                    <span className="text-xs font-bold text-muted-foreground">
                      {chat.last_message_at ? new Date(chat.last_message_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-primary mb-1.5 line-clamp-1">{chat.listing_title}</p>
                  <p className={`text-sm line-clamp-1 ${chat.unread_count ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'}`}>
                    {chat.last_message}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-black text-white shadow-md">
                    {chat.unread_count}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
