"use client";

import { LogOut, MessageCircle, MessageSquarePlus, Moon, Search, Sun, Users, WifiOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatApi } from "@/hooks/use-chat";
import { conversationPeer, conversationTitle } from "@/lib/chat-helpers";
import { cn } from "@/lib/utils";
import type { UserDTO } from "@/types";
import { ConversationItem } from "./conversation-item";
import { NewChatDialog } from "./new-chat-dialog";
import { NewGroupDialog } from "./new-group-dialog";
import { UserAvatar } from "./user-avatar";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
] as const;

export function Sidebar({ me, chat }: { me: UserDTO; chat: ChatApi }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return chat.conversations.filter((c) => {
      if (filter === "unread" && !c.unread) return false;
      if (filter === "groups" && c.type !== "group") return false;
      return !term || conversationTitle(c, me).toLowerCase().includes(term);
    });
  }, [chat.conversations, q, filter, me]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <MessageCircle className="h-[18px] w-[18px]" />
          </span>
          <h1 className="text-xl font-bold tracking-tight">Chats</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Naya group" onClick={() => setGroupOpen(true)}>
            <Users />
          </Button>
          <Button variant="ghost" size="icon" title="Nayi chat" onClick={() => setChatOpen(true)}>
            <MessageSquarePlus />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <UserAvatar name={me.name} color={me.color} size="sm" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-semibold">{me.name}</p>
                <p className="truncate text-xs text-muted-foreground">{me.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={logout}>
                <LogOut /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!chat.connected && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <WifiOff className="h-3.5 w-3.5" /> Reconnecting…
        </div>
      )}

      {/* Search + filters */}
      <div className="space-y-3 px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chats me dhundo"
            className="h-10 rounded-full border-transparent bg-muted pl-9 shadow-none"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="thin-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {chat.loadingList ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))
        ) : list.length ? (
          list.map((c) => (
            <ConversationItem
              key={c.id}
              conv={c}
              me={me}
              active={c.id === chat.activeId}
              online={chat.online.has(conversationPeer(c, me.id)?.id ?? "")}
              isTyping={(chat.typing[c.id]?.length ?? 0) > 0}
              onClick={() => chat.selectConversation(c.id)}
            />
          ))
        ) : (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {q || filter !== "all" ? "Koi chat nahi mili" : "Abhi koi chat nahi. Upar se nayi chat shuru karo."}
          </div>
        )}
      </div>

      <NewChatDialog open={chatOpen} onOpenChange={setChatOpen} me={me} online={chat.online} onPick={chat.openDirect} />
      <NewGroupDialog open={groupOpen} onOpenChange={setGroupOpen} online={chat.online} onCreate={chat.createGroup} />
    </div>
  );
}
