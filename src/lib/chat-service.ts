import { isValidObjectId } from "mongoose";
import { Conversation } from "@/lib/models/Conversation";
import { Message } from "@/lib/models/Message";
import { serializeConversation, serializeMessage } from "@/lib/serialize";
import { emitToUsers } from "@/lib/socket";

/** Conversation tabhi milegi jab user uska member ho */
export async function findMemberConversation(conversationId: string, userId: unknown) {
  if (!isValidObjectId(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, members: userId });
}

export async function conversationDTO(conversationId: unknown) {
  const conv = await Conversation.findById(conversationId).populate("members", "name email color").lean();
  return conv ? serializeConversation(conv) : null;
}

/** Group events ("X added Y") ke liye system message */
export async function postSystemMessage(conv: any, text: string) {
  const msg = await Message.create({ conversation: conv._id, type: "system", text, readBy: [] });
  await Conversation.updateOne(
    { _id: conv._id },
    { lastMessage: { text, kind: "system", createdAt: msg.createdAt }, lastMessageAt: msg.createdAt }
  );
  emitToUsers(conv.members, "message:new", { message: serializeMessage(msg) });
  return msg;
}
