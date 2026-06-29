"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowLeft, Images, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKERBOARD } from "./types";

export function ImageDropZone({
  onFiles,
  compact = false,
  multiple = false,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  multiple?: boolean;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const imgs: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length) onFilesRef.current(imgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  if (compact) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 py-3 px-4 select-none",
          over ? "border-primary bg-primary/5" : "border-foreground/20 hover:border-foreground/40 bg-muted/30",
        )}
      >
        <Images size={15} className={cn("text-muted-foreground shrink-0", over && "text-primary")} />
        <p className="text-sm text-muted-foreground">Adicionar mais imagens</p>
        <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden"
          onChange={(e) => handle(e.target.files)} />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-10 px-8 select-none",
        over ? "border-primary bg-primary/5" : "border-foreground/20 hover:border-foreground/40 bg-muted/30",
      )}
    >
      <div className="size-12 rounded-2xl bg-muted flex items-center justify-center">
        <Images size={22} className={cn("text-muted-foreground", over && "text-primary")} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Arraste, clique ou cole uma imagem</p>
        <p className="text-xs text-muted-foreground mt-0.5 text-balance text-center">Comprimir · Redimensionar · Remover fundo · e mais</p>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

export function ActionCard({ icon, title, desc, onClick }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-start gap-2 p-3 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left w-full">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{desc}</p>
      </div>
    </button>
  );
}

export function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
      <ArrowLeft size={13} /> Voltar
    </button>
  );
}

export function BeforeAfter({
  original,
  result,
  resultLabel,
  checkerboard = false,
  children,
}: {
  original: HTMLImageElement;
  result?: string | null;
  resultLabel: string;
  checkerboard?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
        <div className="rounded-xl overflow-hidden border bg-muted/30">
          <img src={original.src} alt="Original" className="w-full h-auto" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{resultLabel}</span>
        <div className="rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center"
          style={checkerboard ? CHECKERBOARD : undefined}>
          {result
            ? <img src={result} alt={resultLabel} className="w-full h-auto" />
            : children ?? <ImageIcon size={32} className="text-muted-foreground/20" />}
        </div>
      </div>
    </div>
  );
}

export function ControlsBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4">{children}</div>
  );
}
