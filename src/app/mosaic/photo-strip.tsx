"use client";

import { useState, type DragEvent } from "react";
import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { MosaicPhoto } from "./types";

interface PhotoStripProps {
  photos: MosaicPhoto[];
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  canAddMore: boolean;
}

export function PhotoStrip({ photos, onReorder, onRemove, onAddFiles, canAddMore }: PhotoStripProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const onDragOver = (e: DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== to) onReorder(dragIdx, to);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="flex gap-2 overflow-x-auto p-2 border rounded-lg bg-muted/30">
      {photos.map((photo, i) => (
        <motion.div
          key={photo.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: dragIdx === i ? 0.4 : 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOver(e as unknown as DragEvent, i)}
          onDrop={(e) => onDrop(e as unknown as DragEvent, i)}
          className={cn(
            "relative shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing",
            overIdx === i && dragIdx !== i ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent",
          )}
          title={`Foto ${i + 1} — arraste para reordenar`}
        >
          <img src={photo.previewUrl} alt="" className="h-full w-full object-cover pointer-events-none" />
          <span className="absolute bottom-0.5 left-0.5 rounded bg-black/50 px-1 text-[9px] font-mono text-white">
            {i + 1}
          </span>
          <button
            onClick={() => onRemove(photo.id)}
            className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white transition-colors hover:bg-destructive"
            title="Remover foto"
          >
            <X size={10} />
          </button>
        </motion.div>
      ))}

      {canAddMore && (
        <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-foreground/40">
          <Plus size={18} />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onAddFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
