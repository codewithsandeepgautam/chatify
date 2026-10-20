import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conversationColor, conversationPeer, conversationTitle } from "@/lib/chat-helpers";
import type { ConversationDTO, UserDTO } from "@/types";
import { UserAvatar } from "./user-avatar";

type Props = {
  conv: ConversationDTO;
  me: UserDTO;
  online: Set<string>;
  typingUserIds: string[];
  onBack: () => void;
  onInfo: () => void;
};

export function ChatHeader({ conv, me, online, typingUserIds, onBack, onInfo }: Props) {
  const title = conversationTitle(conv, me);
  const peer = conversationPeer(conv, me.id);
  const typingNames = typingUserIds.map((id) => conv.members.find((m) => m.id === id)?.name.split(" ")[0]).filter(Boolean);

  let subtitle: React.ReactNode;
  if (typingNames.length) {
    subtitle = (
      <span className="font-medium text-primary">
        {conv.type === "group" ? `${typingNames.join(", ")} typing…` : "typing…"}
      </span>
    );
  } else if (conv.type === "self") subtitle = "Khud ko message karo · notes & files";
  else if (conv.type === "direct") subtitle = peer && online.has(peer.id) ? <span className="text-emerald-500">online</span> : "offline";
  else subtitle = conv.members.map((m) => (m.id === me.id ? "You" : m.name.split(" ")[0])).join(", ");

  return (
    <header className="flex items-center gap-3 border-b bg-background px-3 py-2.5 sm:px-4">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back">
        <ArrowLeft />
      </Button>
      <button
        onClick={conv.type === "group" ? onInfo : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        disabled={conv.type !== "group"}
      >
        <UserAvatar
          name={title}
          color={conversationColor(conv, me)}
          online={!!peer && online.has(peer.id)}
          variant={conv.type === "group" ? "group" : conv.type === "self" ? "self" : "user"}
        />
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-tight">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>
      {conv.type === "group" && (
        <Button variant="ghost" size="icon" onClick={onInfo} title="Group info">
          <Info />
        </Button>
      )}
    </header>
  );
}
