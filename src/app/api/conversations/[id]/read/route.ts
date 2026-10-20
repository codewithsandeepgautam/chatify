import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findMemberConversation } from "@/lib/chat-service";
import { Message } from "@/lib/models/Message";
import { emitToUsers } from "@/lib/socket";

/** Is conversation ke saare unread messages "read" mark karo */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const conv = await findMemberConversation(id, me._id);
  if (!conv) return NextResponse.json({ error: "Conversation nahi mili" }, { status: 404 });

  const res = await Message.updateMany(
    { conversation: id, sender: { $ne: me._id }, readBy: { $ne: me._id } },
    { $addToSet: { readBy: me._id } }
  );
  if (res.modifiedCount) {
    emitToUsers(conv.members, "message:read", { conversationId: id, userId: String(me._id) });
  }
  return NextResponse.json({ ok: true });
}
