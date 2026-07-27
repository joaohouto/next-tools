"use client";

import { useEffect, useRef } from "react";
import { Camera, Trash2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { Frame } from "../types";
import { formatTimecode } from "../utils";

interface FrameListProps {
  frames: Frame[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCaption: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
}

export function FrameList({ frames, selectedId, onSelect, onCaption, onRemove }: FrameListProps) {
  if (frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 border border-dashed rounded-xl bg-muted/30 text-center">
        <Camera size={20} className="text-muted-foreground" />
        <p className="text-sm font-medium">Nenhum quadro capturado</p>
        <p className="text-xs text-muted-foreground text-balance">
          Navegue até o momento desejado e clique em <strong>Capturar quadro</strong>. Os
          marcadores podem ser arrastados na timeline depois.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground px-1">
        {frames.length} quadro{frames.length !== 1 ? "s" : ""} · em ordem cronológica
      </p>
      <div className="flex flex-col gap-2">
        {frames.map((frame, index) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            index={index}
            selected={frame.id === selectedId}
            onSelect={onSelect}
            onCaption={onCaption}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

function FrameCard({
  frame,
  index,
  selected,
  onSelect,
  onCaption,
  onRemove,
}: {
  frame: Frame;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onCaption: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  return (
    <div
      ref={ref}
      onClick={() => onSelect(frame.id)}
      className={cn(
        "flex gap-3 p-2 border rounded-xl transition-colors cursor-pointer",
        selected ? "border-primary bg-primary/5" : "hover:border-foreground/30 bg-muted/30",
      )}
    >
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.thumb}
          alt={`Quadro ${index + 1}`}
          className="w-32 sm:w-40 aspect-video object-cover rounded-lg bg-black"
        />
        <span className="absolute top-1 left-1 px-1.5 rounded bg-black/70 text-white text-[10px] font-medium tabular-nums">
          {index + 1}
        </span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatTimecode(frame.time)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(frame.id);
            }}
            title="Excluir quadro"
            className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <Textarea
          value={frame.caption}
          onChange={(e) => onCaption(frame.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => onSelect(frame.id)}
          placeholder="Legenda (opcional)"
          rows={2}
          className="resize-none text-xs min-h-0 h-full"
        />
      </div>
    </div>
  );
}
