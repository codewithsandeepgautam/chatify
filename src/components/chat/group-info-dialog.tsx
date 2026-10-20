"use client";

import { Loader2, LogOut, Pencil, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ChatApi } from "@/hooks/use-chat";
import { useUserSearch } from "@/hooks/use-user-search";
import type { ConversationDTO, UserDTO } from "@/types";
import { UserAvatar } from "./user-avatar";
import { UserRow } from "./user-row";

type Props = {
  conv: ConversationDTO;
  me: UserDTO;
  chat: ChatApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GroupInfoDialog({ conv, me, chat, open, onOpenChange }: Props) {
  const isAdmin = conv.admins.includes(me.id);
  const [name, setName] = useState(conv.name ?? "");
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const { users, loading } = useUserSearch(q, open && adding);

  useEffect(() => {
    if (open) {
      setName(conv.name ?? "");
      setAdding(false);
      setQ("");
    }
  }, [open, conv.name]);

  const candidates = users.filter((u) => !conv.members.some((m) => m.id === u.id));

  async function run(fn: () => Promise<void>, fail: string) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : fail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0">
        <DialogHeader className="items-center space-y-3 p-6 pb-4 text-center sm:text-center">
          <UserAvatar name={conv.name ?? "Group"} color="#6366f1" size="lg" variant="group" />
          <div className="w-full space-y-1">
            {isAdmin ? (
              <div className="mx-auto flex max-w-xs items-center gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="text-center font-semibold" />
                <Button
                  size="icon"
                  variant="secondary"
                  disabled={busy || !name.trim() || name.trim() === conv.name}
                  title="Naam save karo"
                  onClick={() => run(() => chat.updateGroup(conv.id, { name: name.trim() }), "Naam change nahi hua")}
                >
                  <Pencil />
                </Button>
              </div>
            ) : (
              <DialogTitle>{conv.name}</DialogTitle>
            )}
            {isAdmin && <DialogTitle className="sr-only">{conv.name}</DialogTitle>}
            <DialogDescription>Group · {conv.members.length} members</DialogDescription>
          </div>
        </DialogHeader>

        <div className="thin-scroll max-h-[48vh] overflow-y-auto border-t px-2 py-2">
          {isAdmin && (
            <button
              onClick={() => setAdding((a) => !a)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
                <UserPlus className="h-4 w-4" />
              </span>
              {adding ? "Add karna band karo" : "Members add karo"}
            </button>
          )}

          {adding && (
            <div className="mb-2 space-y-1 rounded-lg bg-muted/50 p-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam ya email" className="bg-background" />
              {loading && !candidates.length && (
                <div className="flex justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {candidates.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  online={chat.online.has(u.id)}
                  onClick={busy ? undefined : () => run(() => chat.updateGroup(conv.id, { addMemberIds: [u.id] }), "Add nahi hua")}
                />
              ))}
              {!loading && !candidates.length && <p className="py-3 text-center text-xs text-muted-foreground">Add karne ke liye koi user nahi</p>}
            </div>
          )}

          {conv.members.map((m) => (
            <UserRow
              key={m.id}
              user={m.id === me.id ? { ...m, name: `${m.name} (You)` } : m}
              online={chat.online.has(m.id)}
              right={
                <div className="flex items-center gap-1">
                  {conv.admins.includes(m.id) && (
                    <Badge variant="secondary" className="text-[10px]">
                      Admin
                    </Badge>
                  )}
                  {isAdmin && m.id !== me.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Remove"
                      disabled={busy}
                      onClick={() => run(() => chat.updateGroup(conv.id, { removeMemberId: m.id }), "Remove nahi hua")}
                    >
                      <UserMinus />
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await chat.leaveGroup(conv.id);
                onOpenChange(false);
              }, "Group chhoda nahi ja saka")
            }
          >
            <LogOut /> Group chhodo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
