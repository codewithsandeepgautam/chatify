import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { conversationDTO, postSystemMessage } from "@/lib/chat-service";
import { Conversation } from "@/lib/models/Conversation";
import { Message } from "@/lib/models/Message";
import { User } from "@/lib/models/User";
import { serializeConversation } from "@/lib/serialize";
import { emitToUsers, joinConversationRoom } from "@/lib/socket";

/** Meri saari conversations + unread count. Self chat (apni chat) pehli baar yahin ban jaati hai. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  try {
    await Conversation.updateOne(
      { directKey: `self:${me._id}` },
      { $setOnInsert: { type: "self", members: [me._id], createdBy: me._id, lastMessageAt: new Date() } },
      { upsert: true }
    );
  } catch {
    /* parallel request ne bana di - ignore */
  }

  const convs = await Conversation.find({ members: me._id })
    .populate("members", "name email color")
    .sort({ lastMessageAt: -1 })
    .lean();

  const counts: { _id: unknown; n: number }[] = await Message.aggregate([
    {
      $match: {
        conversation: { $in: convs.map((c: any) => c._id) },
        type: "text",
        sender: { $ne: me._id },
        readBy: { $ne: me._id },
      },
    },
    { $group: { _id: "$conversation", n: { $sum: 1 } } },
  ]);
  const unread = new Map(counts.map((c) => [String(c._id), c.n]));

  return NextResponse.json({
    conversations: convs.map((c: any) => serializeConversation(c, unread.get(String(c._id)) ?? 0)),
  });
}

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("direct"), userId: z.string() }),
  z.object({
    type: z.literal("group"),
    name: z.string().trim().min(1, "Group ka naam daalo").max(80),
    memberIds: z.array(z.string()).min(1, "Kam se kam 1 member chuno").max(200),
  }),
]);

/** Naya 1-to-1 chat (ya self chat) / group banao */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const body = parsed.data;

  if (body.type === "direct") {
    if (!isValidObjectId(body.userId)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    const isSelf = body.userId === String(me._id);
    if (!isSelf && !(await User.exists({ _id: body.userId }))) {
      return NextResponse.json({ error: "User nahi mila" }, { status: 404 });
    }

    const key = isSelf ? `self:${me._id}` : [String(me._id), body.userId].sort().join(":");
    let conv = await Conversation.findOne({ directKey: key });
    if (!conv) {
      try {
        conv = await Conversation.create({
          type: isSelf ? "self" : "direct",
          members: isSelf ? [me._id] : [me._id, body.userId],
          createdBy: me._id,
          directKey: key,
        });
      } catch {
        conv = await Conversation.findOne({ directKey: key });
      }
    }
    // dono users ke sockets ko room me daalo taaki typing indicator chale
    joinConversationRoom(conv.members, String(conv._id));
    return NextResponse.json({ conversation: await conversationDTO(conv._id) });
  }

  // group
  const ids = [...new Set(body.memberIds.filter((id) => isValidObjectId(id) && id !== String(me._id)))];
  const users = await User.find({ _id: { $in: ids } }).select("_id");
  if (!users.length) return NextResponse.json({ error: "Valid members chuno" }, { status: 400 });

  const members = [me._id, ...users.map((u: any) => u._id)];
  const conv = await Conversation.create({
    type: "group",
    name: body.name,
    members,
    admins: [me._id],
    createdBy: me._id,
  });

  joinConversationRoom(members, String(conv._id));
  const dto = await conversationDTO(conv._id);
  emitToUsers(members, "conversation:new", { conversation: dto });
  await postSystemMessage(conv, `${me.name} ne group "${body.name}" banaya`);

  return NextResponse.json({ conversation: dto });
}
