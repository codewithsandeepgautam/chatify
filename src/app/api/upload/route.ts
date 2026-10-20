import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findMemberConversation } from "@/lib/chat-service";
import { Attachment } from "@/lib/models/Attachment";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (MongoDB doc limit 16 MB hai)

/** multipart/form-data: file + conversationId  -> MongoDB me Buffer ke roop me save */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const conversationId = String(form?.get("conversationId") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "File nahi mili" }, { status: 400 });
  if (!(await findMemberConversation(conversationId, me._id))) {
    return NextResponse.json({ error: "Conversation nahi mili" }, { status: 404 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Sirf image (PNG/JPG/WEBP/GIF) aur PDF allowed hai" }, { status: 415 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File 10 MB se badi hai" }, { status: 413 });
  }

  const att = await Attachment.create({
    conversation: conversationId,
    uploader: me._id,
    name: file.name.replace(/[\\/\r\n]/g, "_").slice(0, 150) || "file",
    mime: file.type,
    size: file.size,
    data: Buffer.from(await file.arrayBuffer()),
  });

  return NextResponse.json({
    attachment: { id: String(att._id), name: att.name, mime: att.mime, size: att.size },
  });
}
