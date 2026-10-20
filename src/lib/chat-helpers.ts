import type { ConversationDTO, UserDTO } from "@/types";

export function conversationPeer(conv: ConversationDTO, meId: string): UserDTO | null {
  if (conv.type !== "direct") return null;
  return conv.members.find((m) => m.id !== meId) ?? null;
}

export function conversationTitle(conv: ConversationDTO, me: UserDTO) {
  if (conv.type === "group") return conv.name ?? "Group";
  if (conv.type === "self") return `${me.name} (You)`;
  return conversationPeer(conv, me.id)?.name ?? "Unknown";
}

export function conversationColor(conv: ConversationDTO, me: UserDTO) {
  if (conv.type === "group") return "#6366f1";
  if (conv.type === "self") return me.color;
  return conversationPeer(conv, me.id)?.color ?? "#64748b";
}
