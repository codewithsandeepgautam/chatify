export type UserDTO = { id: string; name: string; email: string; color: string };
export type SenderDTO = { id: string; name: string; color: string };
export type AttachmentDTO = { id: string; name: string; mime: string; size: number };

export type MessageDTO = {
  id: string;
  conversationId: string;
  sender: SenderDTO | null;
  type: "text" | "system";
  text: string;
  attachments: AttachmentDTO[];
  readBy: string[];
  createdAt: string;
};

export type LastMessageKind = "text" | "image" | "pdf" | "system";
export type LastMessageDTO = {
  text: string;
  senderId: string | null;
  kind: LastMessageKind;
  createdAt: string;
};

export type ConversationDTO = {
  id: string;
  type: "direct" | "self" | "group";
  name: string | null;
  members: UserDTO[];
  admins: string[];
  createdBy: string | null;
  lastMessage: LastMessageDTO | null;
  lastMessageAt: string;
  unread: number;
};
