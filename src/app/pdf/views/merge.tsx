"use client";

import { useState, useEffect, useRef, useCallback, type DragEvent } from "react";
import { PDFDocument } from "pdf-lib";
import { GripVertical, Trash2, Download, ArrowLeft, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type MergeItem, type ChainSource } from "../types";
import { isPdf, isImage, fmt, addImagePage, renderPage, ACCEPTED, makePdfFile, triggerBytesDownload } from "../utils";

function ThumbSkeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />;
}

function DropZoneCompact({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => isPdf(f) || isImage(f));
    if (files.length) onFiles(files);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 select-none py-4 px-6",
        over ? "border-primary bg-primary/5" : "border-foreground/20 hover:border-foreground/40",
      )}
    >
      <FileText size={20} className={cn("text-muted-foreground", over && "text-primary")} />
      <p className="text-sm text-muted-foreground text-center">Adicionar mais arquivos</p>
      <input ref={ref} type="file" accept={ACCEPTED} multiple className="hidden"
        onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

interface MergeViewProps {
  initial: MergeItem[];
  onBack: () => void;
  onUseResult: (file: File, source: ChainSource) => void;
}

export function MergeView({ initial, onBack, onUseResult }: MergeViewProps) {
  const [items, setItems] = useState<MergeItem[]>(initial);
  const [merging, setMerging] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const objUrls = useRef<string[]>([]);

  useEffect(() => () => objUrls.current.forEach(URL.revokeObjectURL), []);

  useEffect(() => {
    items.forEach((item) => {
      if (item.kind === "pdf" && item.thumbnail === null) {
        renderPage(item.file, 1, 0.35)
          .then((dataUrl) =>
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, thumbnail: dataUrl } : i))))
          .catch(() =>
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, thumbnail: "" } : i))));
      }
    });
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback(async (files: File[]) => {
    const newItems: MergeItem[] = await Promise.all(
      files.map(async (file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        if (isPdf(file)) {
          let pageCount: number | undefined;
          try { pageCount = (await PDFDocument.load(await file.arrayBuffer())).getPageCount(); } catch { /**/ }
          return { id, file, kind: "pdf" as const, pageCount, thumbnail: null };
        } else {
          const url = URL.createObjectURL(file);
          objUrls.current.push(url);
          return { id, file, kind: "image" as const, pageCount: 1, thumbnail: url };
        }
      }),
    );
    setItems((p) => [...p, ...newItems]);
    setResultBytes(null);
  }, []);

  const remove = (id: string) => {
    setItems((p) => {
      const item = p.find((i) => i.id === id);
      if (item?.kind === "image" && item.thumbnail) {
        URL.revokeObjectURL(item.thumbnail);
        objUrls.current = objUrls.current.filter((u) => u !== item.thumbnail);
      }
      return p.filter((i) => i.id !== id);
    });
    setResultBytes(null);
  };

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const onDragOver = (e: DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setOverIdx(null); return; }
    setItems((p) => {
      const next = [...p];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
    setResultBytes(null);
  };

  const merge = async () => {
    if (items.length < 2) { toast.error("Adicione pelo menos 2 arquivos."); return; }
    setMerging(true);
    try {
      const doc = await PDFDocument.create();
      for (const item of items) {
        if (item.kind === "pdf") {
          const src = await PDFDocument.load(await item.file.arrayBuffer());
          const copied = await doc.copyPages(src, src.getPageIndices());
          copied.forEach((p) => doc.addPage(p));
        } else {
          await addImagePage(doc, item.file);
        }
      }
      const bytes = await doc.save();
      setResultBytes(bytes);
      triggerBytesDownload(bytes, "merged.pdf");
      toast.success("PDFs mesclados!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao mesclar.");
    } finally {
      setMerging(false);
    }
  };

  const totalPages = items.reduce((s, i) => s + (i.pageCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={13} /> Voltar
      </button>

      <DropZoneCompact onFiles={addFiles} />

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {items.length} arquivo{items.length !== 1 ? "s" : ""} · {totalPages} página{totalPages !== 1 ? "s" : ""} · arraste para reordenar
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOver(e as unknown as DragEvent, i)}
            onDrop={(e) => onDrop(e as unknown as DragEvent, i)}
            className={cn(
              "flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30 transition-all select-none",
              dragIdx === i && "opacity-40",
              overIdx === i && dragIdx !== i && "ring-2 ring-primary ring-offset-1",
            )}
          >
            <GripVertical size={16} className="text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
            <span className="text-xs text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>

            <div className="h-14 w-10 shrink-0 rounded overflow-hidden border bg-muted flex items-center justify-center">
              {item.thumbnail === null ? (
                <ThumbSkeleton className="w-full h-full" />
              ) : item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <FileText size={16} className="text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(item.file.size)}
                {item.pageCount != null && ` · ${item.pageCount} pág${item.pageCount !== 1 ? "s" : ""}`}
              </p>
            </div>

            <Button variant="ghost" size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={() => remove(item.id)}>
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={merge} disabled={merging || items.length < 2}>
        <Download size={15} />
        {merging ? "Mesclando…" : "Baixar PDF mesclado"}
      </Button>

      {resultBytes && (
        <Button variant="outline" onClick={() =>
          onUseResult(makePdfFile(resultBytes, "merged.pdf"), { toolLabel: "Mesclar", originalName: items[0]?.file.name ?? "" })
        }>
          <ArrowRight size={15} />
          Continuar com este PDF
        </Button>
      )}
    </div>
  );
}
