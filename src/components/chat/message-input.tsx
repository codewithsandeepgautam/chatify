"use client";

import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

type Pending = { id: string; file: File; preview?: string };

type Props = {
  onSend: (text: string, files: File[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
};

export function MessageInput({ onSend, onTyping }: Props) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Pending[]>([]);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  pendingRef.current = pending;

  // textarea auto-grow
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // unmount par preview URLs free karo + typing band
  useEffect(
    () => () => {
      pendingRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      clearTimeout(typingTimer.current);
    },
    []
  );

  function stopTyping() {
    clearTimeout(typingTimer.current);
    if (typingRef.current) {
      typingRef.current = false;
      onTyping(false);
    }
  }

  function handleChange(value: string) {
    setText(value);
    if (!value.trim()) return stopTyping();
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2500);
  }

  function addFiles(list: FileList | File[]) {
    const valid: File[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPT.includes(f.type)) toast.error(`${f.name}: sirf image ya PDF allowed hai`);
      else if (f.size > MAX_SIZE) toast.error(`${f.name}: 10 MB se badi file`);
      else valid.push(f);
    }
    const room = MAX_FILES - pendingRef.current.length;
    if (valid.length > room) toast.error(`Ek message me max ${MAX_FILES} files`);
    const accepted = valid.slice(0, Math.max(room, 0)).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    if (accepted.length) setPending((prev) => [...prev, ...accepted]);
  }

  function removeFile(id: string) {
    const target = pendingRef.current.find((p) => p.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  async function submit() {
    const t = text.trim();
    if ((!t && !pending.length) || sending) return;
    setSending(true);
    stopTyping();
    try {
      await onSend(t, pending.map((p) => p.file));
      pending.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setPending([]);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message nahi bhej paye");
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  }

  const canSend = (!!text.trim() || pending.length > 0) && !sending;

  return (
    <div
      className={cn("relative border-t bg-background px-3 pb-3 pt-2 sm:px-4", dragging && "bg-accent/40")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-1 z-10 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-background/80 text-sm font-medium text-primary">
          Yahan chhodo — image ya PDF
        </div>
      )}

      {pending.length > 0 && (
        <div className="thin-scroll mb-2 flex gap-2 overflow-x-auto pb-1">
          {pending.map((p) => (
            <div key={p.id} className="group relative shrink-0">
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.preview} alt={p.file.name} className="h-16 w-16 rounded-xl border object-cover" />
              ) : (
                <div className="flex h-16 w-44 items-center gap-2 rounded-xl border bg-muted px-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500 text-white">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{p.file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(p.file.size)}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => removeFile(p.id)}
                disabled={sending}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept={ACCEPT.join(",")}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full" title="Image / PDF attach karo" onClick={() => fileRef.current?.click()}>
          <Paperclip className="!size-5" />
        </Button>

        <textarea
          ref={taRef}
          value={text}
          rows={1}
          placeholder="Message likho…"
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            const touch = window.matchMedia("(pointer: coarse)").matches; // mobile par Enter = nayi line
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !touch) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          className="thin-scroll max-h-40 min-h-10 flex-1 resize-none rounded-3xl bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
        />

        <Button type="button" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={!canSend} onClick={submit} title="Send">
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}
