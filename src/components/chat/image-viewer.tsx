"use client";

import { Download, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { AttachmentDTO } from "@/types";

/** Image par click karne par bada preview (lightbox) */
export function ImageViewer({ image, onClose }: { image: AttachmentDTO | null; onClose: () => void }) {
  return (
    <Dialog open={!!image} onOpenChange={(o) => !o && onClose()}>
      <DialogContent hideClose aria-describedby={undefined} className="max-w-5xl gap-0 border-0 bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{image?.name}</DialogTitle>
        {image && (
          <div className="relative flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between rounded-xl bg-black/60 px-4 py-2 text-white backdrop-blur">
              <p className="truncate text-sm">{image.name}</p>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/files/${image.id}?download=1`}
                  className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <DialogClose className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Close">
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${image.id}`} alt={image.name} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
