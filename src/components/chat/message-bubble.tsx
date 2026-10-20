import { Check, CheckCheck, Download, ExternalLink, FileText } from "lucide-react";
import { cn, formatBytes, formatTime } from "@/lib/utils";
import type { AttachmentDTO, MessageDTO } from "@/types";
import { UserAvatar } from "./user-avatar";

type Props = {
  message: MessageDTO;
  isMine: boolean;
  isGroup: boolean;
  /** run ka pehla message: group me sender ka naam + avatar dikhao */
  firstInRun: boolean;
  showTicks: boolean;
  read: boolean;
  onMediaLoad: () => void;
  onOpenImage: (a: AttachmentDTO) => void;
};

function PdfCard({ file, mine }: { file: AttachmentDTO; mine: boolean }) {
  return (
    <div className={cn("flex min-w-[230px] items-center gap-3 rounded-xl p-2.5", mine ? "bg-white/15" : "bg-muted")}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500 text-white">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className={cn("text-xs", mine ? "text-white/70" : "text-muted-foreground")}>PDF · {formatBytes(file.size)}</p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <a
          href={`/api/files/${file.id}`}
          target="_blank"
          rel="noreferrer"
          title="Open"
          className={cn("grid h-8 w-8 place-items-center rounded-lg", mine ? "hover:bg-white/20" : "hover:bg-accent")}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <a
          href={`/api/files/${file.id}?download=1`}
          title="Download"
          className={cn("grid h-8 w-8 place-items-center rounded-lg", mine ? "hover:bg-white/20" : "hover:bg-accent")}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export function MessageBubble({ message: m, isMine, isGroup, firstInRun, showTicks, read, onMediaLoad, onOpenImage }: Props) {
  if (m.type === "system") {
    return (
      <div className="my-3 flex justify-center">
        <span className="rounded-full border bg-background/80 px-3 py-1 text-center text-xs text-muted-foreground backdrop-blur">
          {m.text}
        </span>
      </div>
    );
  }

  const images = m.attachments.filter((a) => a.mime.startsWith("image/"));
  const pdfs = m.attachments.filter((a) => a.mime === "application/pdf");
  const mediaOnly = !m.text && !pdfs.length && !!images.length;
  const showName = isGroup && !isMine && firstInRun && m.sender;

  return (
    <div className={cn("bubble-in flex items-end gap-2", isMine ? "justify-end" : "justify-start")}>
      {isGroup && !isMine && (
        <div className="w-7 shrink-0">
          {firstInRun && m.sender && <UserAvatar name={m.sender.name} color={m.sender.color} size="xs" />}
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl text-sm shadow-sm sm:max-w-[68%]",
          mediaOnly ? "p-1" : "px-3 py-2",
          isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card text-card-foreground",
          firstInRun && (isMine ? "rounded-tr-2xl" : "rounded-tl-2xl")
        )}
      >
        {showName && m.sender && (
          <p className="mb-0.5 px-0.5 text-xs font-semibold" style={{ color: m.sender.color }}>
            {m.sender.name}
          </p>
        )}

        {images.length > 0 && (
          <div className={cn("grid gap-1", images.length > 1 ? "grid-cols-2" : "grid-cols-1", !mediaOnly && "mb-1.5")}>
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => onOpenImage(img)}
                className="overflow-hidden rounded-xl bg-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${img.id}`}
                  alt={img.name}
                  loading="lazy"
                  onLoad={onMediaLoad}
                  className={cn(
                    "cursor-zoom-in object-cover transition-transform hover:scale-[1.02]",
                    images.length > 1 ? "h-36 w-full" : "max-h-80 min-h-24 min-w-40 max-w-full"
                  )}
                />
              </button>
            ))}
          </div>
        )}

        {pdfs.length > 0 && (
          <div className={cn("space-y-1.5", m.text && "mb-1.5")}>
            {pdfs.map((f) => (
              <PdfCard key={f.id} file={f} mine={isMine} />
            ))}
          </div>
        )}

        {m.text && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.text}</p>}

        <div
          className={cn(
            "flex items-center justify-end gap-1 text-[10px]",
            mediaOnly ? "px-2 pb-1 pt-0.5" : "mt-0.5",
            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          <span>{formatTime(m.createdAt)}</span>
          {isMine && showTicks &&
            (read ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" /> : <Check className="h-3.5 w-3.5" />)}
        </div>
      </div>
    </div>
  );
}
