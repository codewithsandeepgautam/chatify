import { FileText, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { conversationColor, conversationPeer, conversationTitle } from "@/lib/chat-helpers";
import { cn, formatListTime } from "@/lib/utils";
import type { ConversationDTO, UserDTO } from "@/types";
import { UserAvatar } from "./user-avatar";

type Props = {
  conv: ConversationDTO;
  me: UserDTO;
  active: boolean;
  online: boolean;
  isTyping: boolean;
  onClick: () => void;
};

export function ConversationItem({ conv, me, active, online, isTyping, onClick }: Props) {
  const title = conversationTitle(conv, me);
  const peer = conversationPeer(conv, me.id);
  const lm = conv.lastMessage;

  let prefix = "";
  if (lm && lm.kind !== "system" && conv.type !== "self") {
    if (lm.senderId === me.id) prefix = "You: ";
    else if (conv.type === "group") {
      const s = conv.members.find((m) => m.id === lm.senderId);
      if (s) prefix = `${s.name.split(" ")[0]}: `;
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
        active && "bg-accent"
      )}
    >
      <UserAvatar
        name={title}
        color={conversationColor(conv, me)}
        online={!!peer && online}
        variant={conv.type === "group" ? "group" : conv.type === "self" ? "self" : "user"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{title}</p>
          {lm && (
            <span className={cn("shrink-0 text-[11px] text-muted-foreground", conv.unread > 0 && "font-medium text-primary")}>
              {formatListTime(lm.createdAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 truncate text-[13px] text-muted-foreground">
            {isTyping ? (
              <span className="font-medium text-primary">typing…</span>
            ) : !lm ? (
              <span className="italic">Abhi koi message nahi</span>
            ) : (
              <>
                {prefix && <span className="shrink-0">{prefix}</span>}
                {lm.kind === "image" && <ImageIcon className="h-3.5 w-3.5 shrink-0" />}
                {lm.kind === "pdf" && <FileText className="h-3.5 w-3.5 shrink-0" />}
                <span className={cn("truncate", lm.kind === "system" && "italic")}>{lm.text}</span>
              </>
            )}
          </p>
          {conv.unread > 0 && (
            <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[11px]">
              {conv.unread > 99 ? "99+" : conv.unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
