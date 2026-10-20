"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatApi } from "@/hooks/use-chat";
import { cn, formatDayLabel, isSameDay } from "@/lib/utils";
import type { AttachmentDTO, ConversationDTO, UserDTO } from "@/types";
import { ChatHeader } from "./chat-header";
import { GroupInfoDialog } from "./group-info-dialog";
import { ImageViewer } from "./image-viewer";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";

const RUN_GAP = 5 * 60 * 1000; // 5 min se zyada gap => naya "run"

type Props = { conv: ConversationDTO; me: UserDTO; chat: ChatApi; onBack: () => void };

export function ChatWindow({ conv, me, chat, onBack }: Props) {
  const state = chat.messages[conv.id];
  const items = state?.items ?? [];
  const typingIds = chat.typing[conv.id] ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // user bottom ke paas hai?
  const anchor = useRef<number | null>(null); // purane messages load hone se pehle scrollHeight
  const didInit = useRef(false);
  const lastId = useRef<string | null>(null);

  const [viewer, setViewer] = useState<AttachmentDTO | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const scrollToBottom = useCallback((smooth = false) => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !items.length) return;
    const last = items[items.length - 1];
    if (anchor.current !== null) {
      el.scrollTop += el.scrollHeight - anchor.current; // purane messages upar jude, position wahi rakho
      anchor.current = null;
    } else if (!didInit.current) {
      el.scrollTop = el.scrollHeight;
      didInit.current = true;
    } else if (last.id !== lastId.current && (last.sender?.id === me.id || stick.current)) {
      scrollToBottom(true);
    }
    lastId.current = last.id;
  }, [items, me.id, scrollToBottom]);

  // typing indicator aane par bhi neeche rahe
  useLayoutEffect(() => {
    if (typingIds.length && stick.current) scrollToBottom(true);
  }, [typingIds.length, scrollToBottom]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (el.scrollTop < 120 && state?.hasMore && !state.loading) {
      anchor.current = el.scrollHeight;
      chat.loadOlder(conv.id);
    }
  }

  const onMediaLoad = useCallback(() => {
    if (stick.current) scrollToBottom();
  }, [scrollToBottom]);

  const showTicks = conv.type !== "self";
  const initialLoading = !state || (state.loading && !items.length);

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        conv={conv}
        me={me}
        online={chat.online}
        typingUserIds={typingIds}
        onBack={() => chat.selectConversation(null)}
        onInfo={() => setInfoOpen(true)}
      />

      <div ref={scrollRef} onScroll={onScroll} className="chat-bg thin-scroll relative flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {state?.loading && items.length > 0 && (
          <div className="flex justify-center py-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {initialLoading ? (
          <div className="space-y-3">
            {[60, 40, 70, 35].map((w, i) => (
              <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                <Skeleton className="h-10 rounded-2xl" style={{ width: `${w}%`, maxWidth: 320 }} />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <div className="grid h-full place-items-center">
            <div className="max-w-xs rounded-2xl border bg-background/80 px-5 py-4 text-center text-sm text-muted-foreground backdrop-blur">
              {conv.type === "self"
                ? "Ye aapki personal chat hai — notes, links, images aur PDF yahan save karo."
                : "Abhi koi message nahi. Pehla message bhejo 👋"}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {items.map((m, i) => {
              const prev = items[i - 1];
              const newDay = !prev || !isSameDay(prev.createdAt, m.createdAt);
              const firstInRun =
                newDay ||
                prev.type === "system" ||
                m.type === "system" ||
                prev.sender?.id !== m.sender?.id ||
                +new Date(m.createdAt) - +new Date(prev.createdAt) > RUN_GAP;
              const others = conv.members.filter((u) => u.id !== m.sender?.id);
              const read = others.length > 0 && others.every((u) => m.readBy.includes(u.id));

              return (
                <div key={m.id} className={cn(firstInRun && !newDay && "mt-3", !firstInRun && "mt-0.5")}>
                  {newDay && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                        {formatDayLabel(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    isMine={m.sender?.id === me.id}
                    isGroup={conv.type === "group"}
                    firstInRun={firstInRun}
                    showTicks={showTicks}
                    read={read}
                    onMediaLoad={onMediaLoad}
                    onOpenImage={setViewer}
                  />
                </div>
              );
            })}

            {typingIds.length > 0 && (
              <div className="mt-2 flex items-end gap-2">
                {conv.type === "group" && <div className="w-7" />}
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-4 py-3 shadow-sm">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <MessageInput
        onSend={(text, files) => chat.sendMessage(conv.id, text, files)}
        onTyping={(t) => chat.emitTyping(conv.id, t)}
      />

      <ImageViewer image={viewer} onClose={() => setViewer(null)} />
      {conv.type === "group" && <GroupInfoDialog conv={conv} me={me} chat={chat} open={infoOpen} onOpenChange={setInfoOpen} />}
    </div>
  );
}
