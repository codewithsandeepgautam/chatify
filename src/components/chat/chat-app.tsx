"use client";

import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import type { UserDTO } from "@/types";
import { ChatWindow } from "./chat-window";
import { EmptyState } from "./empty-state";
import { Sidebar } from "./sidebar";

/** Poora chat layout: left = chats list, right = open chat. Mobile par ek time me ek hi panel. */
export function ChatApp({ me }: { me: UserDTO }) {
  const chat = useChat(me);
  const active = chat.conversations.find((c) => c.id === chat.activeId) ?? null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside className={cn("w-full shrink-0 flex-col border-r md:flex md:w-[380px]", active ? "hidden" : "flex")}>
        <Sidebar me={me} chat={chat} />
      </aside>
      <main className={cn("min-w-0 flex-1 flex-col md:flex", active ? "flex" : "hidden")}>
        {active ? (
          <ChatWindow key={active.id} conv={active} me={me} chat={chat} onBack={() => chat.selectConversation(null)} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
