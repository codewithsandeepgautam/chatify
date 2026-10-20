import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findMemberConversation } from "@/lib/chat-service";
import { Attachment } from "@/lib/models/Attachment";

/** File serve karo (sirf us conversation ke members ko). ?download=1 -> download */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const att = await Attachment.findById(id).select("+data");
  if (!att || !(await findMemberConversation(String(att.conversation), me._id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const body = new Uint8Array(att.data as Buffer);

  return new Response(body as unknown as BodyInit, {
    headers: {
      "Content-Type": att.mime,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(att.name)}`,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
