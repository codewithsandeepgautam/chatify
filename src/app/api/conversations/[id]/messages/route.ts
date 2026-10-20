import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findMemberConversation } from "@/lib/chat-service";
import { Attachment } from "@/lib/models/Attachment";
import { Conversation } from "@/lib/models/Conversation";
import { Message } from "@/lib/models/Message";
import { kindOfMime, serializeMessage } from "@/lib/serialize";
import { emitToUsers } from "@/lib/socket";

type Ctx = { params: Promise<{ id: string }> };

/** Messages (purane se naye), pagination: ?before=<messageId>&limit=30 */
export async function GET(req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  if (!(await findMemberConversation(id, me._id))) {
    return NextResponse.json({ error: "Conversation nahi mili" }, { status: 404 });
  }

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 30, 1), 50);
  const before = sp.get("before");
  const query: Record<string, unknown> = { conversation: id };
  if (before && isValidObjectId(before)) query._id = { $lt: before };

  const rows = await Message.find(query).sort({ _id: -1 }).limit(limit + 1).populate("sender", "name color").lean();
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  rows.reverse();

  return NextResponse.json({ messages: rows.map(serializeMessage), hasMore });
}

const sendSchema = z.object({
  text: z.string().max(5000).default(""),
  attachmentIds: z.array(z.string()).max(10).default([]),
});

/** Message bhejo (text + uploaded attachments) */
export async function POST(req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const conv = await findMemberConversation(id, me._id);
  if (!conv) return NextResponse.json({ error: "Conversation nahi mili" }, { status: 404 });

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const text = parsed.data.text.trim();
  const ids = [...new Set(parsed.data.attachmentIds.filter(isValidObjectId))];
  if (!text && !ids.length) return NextResponse.json({ error: "Khali message nahi bhej sakte" }, { status: 400 });

  // sirf meri upload ki hui, isi conversation ki, aur abhi tak kisi message se na judi files
  const atts = ids.length
    ? await Attachment.find({ _id: { $in: ids }, conversation: id, uploader: me._id, attached: false }).select("name mime size")
    : [];
  if (atts.length !== ids.length) return NextResponse.json({ error: "Attachment invalid hai" }, { status: 400 });

  const msg = await Message.create({
    conversation: id,
    sender: me._id,
    text,
    attachments: atts.map((a: any) => ({ file: a._id, name: a.name, mime: a.mime, size: a.size })),
    readBy: [me._id],
  });
  if (atts.length) await Attachment.updateMany({ _id: { $in: ids } }, { attached: true });

  const preview = text || (atts.length > 1 ? `${atts.length} files` : atts[0]?.name ?? "");
  await Conversation.updateOne(
    { _id: id },
    {
      lastMessage: {
        text: preview.slice(0, 120),
        sender: me._id,
        kind: atts.length ? kindOfMime(atts[0].mime) : "text",
        createdAt: msg.createdAt,
      },
      lastMessageAt: msg.createdAt,
    }
  );

  await msg.populate("sender", "name color");
  const dto = serializeMessage(msg);
  emitToUsers(conv.members, "message:new", { message: dto });
  return NextResponse.json({ message: dto });
}
