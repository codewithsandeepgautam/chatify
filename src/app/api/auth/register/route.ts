import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setAuthCookie, signToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { serializeUser } from "@/lib/serialize";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];

const schema = z.object({
  name: z.string().trim().min(2, "Name kam se kam 2 letters ka ho").max(60),
  email: z.string().trim().toLowerCase().email("Valid email daalo"),
  password: z.string().min(6, "Password kam se kam 6 characters ka ho").max(100),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  await connectDB();
  if (await User.exists({ email })) {
    return NextResponse.json({ error: "Is email se account pehle se hai" }, { status: 409 });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  });

  await setAuthCookie(signToken(String(user._id)));
  return NextResponse.json({ user: serializeUser(user) });
}
