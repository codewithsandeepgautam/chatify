import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { serializeUser } from "@/lib/serialize";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email daalo"),
  password: z.string().min(1, "Password daalo"),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  await connectDB();
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ya password galat hai" }, { status: 401 });
  }

  await setAuthCookie(signToken(String(user._id)));
  return NextResponse.json({ user: serializeUser(user) });
}
