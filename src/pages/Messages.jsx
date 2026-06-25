import { MOCK_USERS } from "@/data/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

const MOCK_CHATS = [
  {
    id: "m1",
    user: MOCK_USERS[0],
    lastMessage: "Is the Buster Sword heavy to carry around?",
    time: "2m ago",
    unread: 2,
    listing: "Buster Sword 3D Print Kit"
  },
  {
    id: "m2",
    user: MOCK_USERS[1],
    lastMessage: "I'll take the Sailor Moon wand. Can you ship tomorrow?",
    time: "1h ago",
    unread: 0,
    listing: "Moon Stick Prop Replica"
  }
];

export default function Messages() {
  return (
    <div className="flex flex-col h-full bg-black">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-12 pb-4 px-4">
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages..." 
            className="pl-9 bg-card border-border/50 h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 p-2">
        {MOCK_CHATS.map((chat) => (
          <Link key={chat.id} href="#">
            <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-card transition-colors cursor-pointer border border-transparent hover:border-border/50 group">
              <Avatar className="h-14 w-14 border-2 border-transparent group-hover:border-primary/50 transition-colors">
                <AvatarImage src={chat.user.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary">{chat.user.username.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-foreground">{chat.user.username}</h3>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-xs text-primary mb-1 line-clamp-1">{chat.listing}</p>
                <p className={`text-sm line-clamp-1 ${chat.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {chat.lastMessage}
                </p>
              </div>
              {chat.unread > 0 && (
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {chat.unread}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
