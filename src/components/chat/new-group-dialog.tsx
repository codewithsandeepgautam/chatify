"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/hooks/use-user-search";
import type { UserDTO } from "@/types";
import { UserRow } from "./user-row";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  online: Set<string>;
  onCreate: (name: string, memberIds: string[]) => Promise<void>;
};

export function NewGroupDialog({ open, onOpenChange, online, onCreate }: Props) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<UserDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const { users, loading } = useUserSearch(q, open);

  useEffect(() => {
    if (!open) {
      setName("");
      setQ("");
      setSelected([]);
    }
  }, [open]);

  const toggle = (u: UserDTO) =>
    setSelected((prev) => (prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]));

  async function create() {
    setBusy(true);
    try {
      await onCreate(name.trim(), selected.map((s) => s.id));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Group nahi ban paya");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="space-y-1 p-5 pb-3">
          <DialogTitle>Naya group</DialogTitle>
          <DialogDescription>Group ka naam rakho aur members chuno.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 pb-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group ka naam" maxLength={80} autoFocus />

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggle(u)}
                  className="flex items-center gap-1 rounded-full bg-accent py-1 pl-3 pr-2 text-xs font-medium text-accent-foreground hover:bg-accent/70"
                >
                  {u.name}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Members dhundo" className="pl-9" />
          </div>
        </div>

        <div className="thin-scroll max-h-[40vh] overflow-y-auto px-2">
          {loading && !users.length && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {users.map((u) => (
            <UserRow key={u.id} user={u} online={online.has(u.id)} showCheck selected={selected.some((s) => s.id === u.id)} onClick={() => toggle(u)} />
          ))}
          {!loading && !users.length && <p className="py-8 text-center text-sm text-muted-foreground">Koi user nahi mila</p>}
        </div>

        <DialogFooter className="border-t p-4">
          <Button onClick={create} disabled={busy || !name.trim() || !selected.length} className="w-full sm:w-auto">
            {busy && <Loader2 className="animate-spin" />}
            Group banao{selected.length > 0 && ` (${selected.length + 1} members)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
