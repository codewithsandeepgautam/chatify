"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/hooks/use-user-search";
import type { UserDTO } from "@/types";
import { UserAvatar } from "./user-avatar";
import { UserRow } from "./user-row";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: UserDTO;
  online: Set<string>;
  onPick: (userId: string) => Promise<void>;
};

export function NewChatDialog({ open, onOpenChange, me, online, onPick }: Props) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const { users, loading } = useUserSearch(q, open);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  async function pick(id: string) {
    setBusy(true);
    try {
      await onPick(id);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat nahi khul payi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="space-y-1 p-5 pb-3">
          <DialogTitle>Nayi chat</DialogTitle>
          <DialogDescription>Kisi se baat shuru karo ya khud ko message karo.</DialogDescription>
        </DialogHeader>

        <div className="relative px-5 pb-3">
          <Search className="absolute left-8 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam ya email se dhundo" className="pl-9" />
        </div>

        <div className="thin-scroll max-h-[50vh] overflow-y-auto px-2 pb-3">
          {!q && (
            <button
              disabled={busy}
              onClick={() => pick(me.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <UserAvatar name={me.name} color={me.color} size="sm" variant="self" />
              <div>
                <p className="text-sm font-medium">{me.name} (You)</p>
                <p className="text-xs text-muted-foreground">Khud ko message karo — notes, files, links</p>
              </div>
            </button>
          )}

          {loading && !users.length && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {users.map((u) => (
            <UserRow key={u.id} user={u} online={online.has(u.id)} onClick={busy ? undefined : () => pick(u.id)} />
          ))}
          {!loading && !users.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {q ? "Koi user nahi mila" : "Abhi koi aur user nahi hai. Dusra account banao (incognito window me)."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
