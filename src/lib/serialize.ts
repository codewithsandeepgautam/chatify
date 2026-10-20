import type { ConversationDTO, LastMessageKind, MessageDTO, UserDTO } from "@/types";

export const kindOfMime = (mime: string): LastMessageKind => (mime === "application/pdf" ? "pdf" : "image");

export const serializeUser = (u: any): UserDTO => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  color: u.color,
});

/** `members` populated hone chahiye */
export const serializeConversation = (c: any, unread = 0): ConversationDTO => ({
  id: String(c._id),
  type: c.type,
  name: c.name ?? null,
  members: (c.members as any[]).map(serializeUser),
  admins: (c.admins ?? []).map(String),
  createdBy: c.createdBy ? String(c.createdBy) : null,
  lastMessage: c.lastMessage
    ? {
        text: c.lastMessage.text ?? "",
        senderId: c.lastMessage.sender ? String(c.lastMessage.sender) : null,
        kind: c.lastMessage.kind ?? "text",
        createdAt: new Date(c.lastMessage.createdAt).toISOString(),
      }
    : null,
  lastMessageAt: new Date(c.lastMessageAt).toISOString(),
  unread,
});

/** `sender` populated hona chahiye (name + color) */
export const serializeMessage = (m: any): MessageDTO => {
  const s = m.sender;
  return {
    id: String(m._id),
    conversationId: String(m.conversation),
    sender: s && s.name ? { id: String(s._id), name: s.name, color: s.color } : null,
    type: m.type,
    text: m.text ?? "",
    attachments: (m.attachments ?? []).map((a: any) => ({
      id: String(a.file),
      name: a.name,
      mime: a.mime,
      size: a.size,
    })),
    readBy: (m.readBy ?? []).map(String),
    createdAt: new Date(m.createdAt).toISOString(),
  };
};
