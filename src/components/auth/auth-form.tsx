"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, MessageCircle, Image as ImageIcon, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FEATURES = [
  { icon: Zap, text: "Realtime messages, typing aur online status" },
  { icon: Users, text: "1-to-1, group aur apni personal chat" },
  { icon: ImageIcon, text: "Images aur PDF bhejo, seedha chat me" },
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kuch galat hua");
      router.replace("/chat");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kuch galat hua");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-xl font-semibold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <MessageCircle className="h-5 w-5" />
          </span>
          Chatly
        </div>
        <div className="relative space-y-8">
          <h1 className="text-4xl font-bold leading-tight">
            Apno se baat karo,
            <br />
            bina rukawat ke.
          </h1>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} Chatly</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </span>
            Chatly
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">{isRegister ? "Account banao" : "Wapas aaye? Welcome!"}</h2>
            <p className="text-sm text-muted-foreground">
              {isRegister ? "30 second me ready ho jao." : "Chat shuru karne ke liye login karo."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input id="name" name="name" placeholder="Sandeep" autoComplete="name" required className="h-11" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={isRegister ? 6 : undefined}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isRegister ? "Sign up" : "Login"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "Pehle se account hai?" : "Naya ho?"}{" "}
            <Link href={isRegister ? "/login" : "/register"} className="font-medium text-primary hover:underline">
              {isRegister ? "Login karo" : "Account banao"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
