import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { serializeUser } from "@/lib/serialize";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** GET /api/users?q=  -> baaki users (khud ko chhodkar), name/email se search */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const filter: Record<string, unknown> = { _id: { $ne: me._id } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ name: 1 }).limit(25);
  return NextResponse.json({ users: users.map(serializeUser) });
}
