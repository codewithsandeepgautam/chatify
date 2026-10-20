import { Image as ImageIcon, Lock, MessageCircle, Users } from "lucide-react";

export function EmptyState() {
  return (
    <div className="chat-bg flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
        <MessageCircle className="h-10 w-10" />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Chatly me aapka swagat hai</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Left se koi chat chuno, ya naya chat / group shuru karo. Khud ko bhi message kar sakte ho.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5">
          <Users className="h-3.5 w-3.5" /> Group chat
        </span>
        <span className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> Image & PDF
        </span>
        <span className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5">
          <Lock className="h-3.5 w-3.5" /> Private files
        </span>
      </div>
    </div>
  );
}
