import { redirect } from "next/navigation";
import { ChatApp } from "@/components/chat/chat-app";
import { getCurrentUser } from "@/lib/auth";
import { serializeUser } from "@/lib/serialize";

export default async function ChatPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return <ChatApp me={serializeUser(me)} />;
}
