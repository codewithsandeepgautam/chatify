import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { conversationDTO, findMemberConversation, postSystemMessage } from "@/lib/chat-service";
import { Attachment } from "@/lib/models/Attachment";
import { Conversation } from "@/lib/models/Conversation";
import { Message } from "@/lib/models/Message";
import { User } from "@/lib/models/User";
import { emitToUsers, joinConversationRoom, leaveConversationRoom } from "@/lib/socket";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  addMemberIds: z.array(z.string()).max(200).optional(),
  removeMemberId: z.string().optional(),
});

/** Group admin: rename / member add / member remove */
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const conv = await findMemberConversation((await params).id, me._id);
  if (!conv || conv.type !== "group") return NextResponse.json({ error: "Group nahi mila" }, { status: 404 });
  if (!conv.admins.some((a: any) => String(a) === String(me._id))) {
    return NextResponse.json({ error: "Sirf admin ye kar sakta hai" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, addMemberIds, removeMemberId } = parsed.data;
  const id = String(conv._id);
  const events: string[] = [];

  if (name && name !== conv.name) {
    conv.name = name;
    events.push(`${me.name} ne group ka naam "${name}" kar diya`);
  }

  let added: any[] = [];
  if (addMemberIds?.length) {
    const existing = new Set(conv.members.map(String));
    const wanted = [...new Set(addMemberIds.filter((m) => isValidObjectId(m) && !existing.has(m)))];
    added = await User.find({ _id: { $in: wanted } }).select("_id name");
    if (added.length) {
      conv.members.push(...added.map((u) => u._id));
      events.push(`${me.name} ne ${added.map((u) => u.name).join(", ")} ko add kiya`);
    }
  }

  let removed: any = null;
  if (removeMemberId && removeMemberId !== String(me._id) && conv.members.some((m: any) => String(m) === removeMemberId)) {
    removed = await User.findById(removeMemberId).select("_id name");
    conv.members = conv.members.filter((m: any) => String(m) !== removeMemberId);
    conv.admins = conv.admins.filter((a: any) => String(a) !== removeMemberId);
    if (removed) events.push(`${me.name} ne ${removed.name} ko remove kiya`);
  }

  await conv.save();
  const dto = await conversationDTO(conv._id);

  if (added.length) {
    const addedIds = added.map((u) => u._id);
    joinConversationRoom(addedIds, id);
    emitToUsers(addedIds, "conversation:new", { conversation: dto });
  }
  if (removed) {
    leaveConversationRoom([removed._id], id);
    emitToUsers([removed._id], "conversation:removed", { id });
  }
  emitToUsers(conv.members, "conversation:update", { conversation: dto });
  for (const text of events) await postSystemMessage(conv, text);

  return NextResponse.json({ conversation: dto });
}

/** Group chhodo (leave) */
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const conv = await findMemberConversation((await params).id, me._id);
  if (!conv || conv.type !== "group") return NextResponse.json({ error: "Group nahi mila" }, { status: 404 });
  const id = String(conv._id);

  conv.members = conv.members.filter((m: any) => String(m) !== String(me._id));
  conv.admins = conv.admins.filter((a: any) => String(a) !== String(me._id));

  leaveConversationRoom([me._id], id);
  emitToUsers([me._id], "conversation:removed", { id });

  if (!conv.members.length) {
    // aakhri member bhi nikal gaya -> sab data saaf
    await Promise.all([
      Message.deleteMany({ conversation: conv._id }),
      Attachment.deleteMany({ conversation: conv._id }),
      Conversation.deleteOne({ _id: conv._id }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (!conv.admins.length) conv.admins = [conv.members[0]]; // koi admin na bache to pehla member admin
  await conv.save();

  emitToUsers(conv.members, "conversation:update", { conversation: await conversationDTO(conv._id) });
  await postSystemMessage(conv, `${me.name} ne group chhod diya`);
  return NextResponse.json({ ok: true });
}
