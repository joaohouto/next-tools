"use client";

import { useState, useEffect, type DragEvent } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import {
  GripVertical, Trash2, Download, ArrowLeft, ArrowRight,
  RotateCcw, RotateCw, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { type PageRot, type ViewProps } from "../types";
import { getPdfjs, makePdfFile, triggerBytesDownload } from "../utils";

function ThumbSkeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />;
}

export function OrganizeView({ file, pageCount, onBack, onUseResult }: ViewProps) {
  const [pages, setPages] = useState<PageRot[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const existingRots = doc.getPages().map((p) => p.getRotation().angle);

        setPages(
          Array.from({ length: pageCount }, (_, i) => ({
            number: i + 1,
            thumb: null,
            existingDeg: existingRots[i] ?? 0,
            delta: 0,
            deleted: false,
          })),
        );

        const pdfjs = await getPdfjs();
        const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
        for (let n = 1; n <= pageCount; n++) {
          if (controller.signal.aborted) break;
          const page = await pdfjsDoc.getPage(n);
          const vp = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setPages((prev) => prev.map((p) => (p.number === n ? { ...p, thumb: dataUrl } : p)));
        }
      } catch { /* silent */ }
    })();
    return () => controller.abort();
  }, [file, pageCount]);

  const applyDelta = (nums: number[], deg: number) => {
    setPages((prev) =>
      prev.map((p) =>
        nums.includes(p.number)
          ? { ...p, delta: ((p.delta + deg) % 360 + 360) % 360 }
          : p,
      ),
    );
    setResultBytes(null);
  };

  const resetDelta = (nums: number[]) => {
    setPages((prev) => prev.map((p) => (nums.includes(p.number) ? { ...p, delta: 0 } : p)));
    setResultBytes(null);
  };

  const toggleDelete = (num: number) => {
    setPages((prev) => prev.map((p) => (p.number === num ? { ...p, deleted: !p.deleted } : p)));
    setResultBytes(null);
  };

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  // DnD handlers
  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const onDragOver = (e: DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setOverIdx(null); return; }
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
    setResultBytes(null);
  };

  const allNums = pages.map((p) => p.number);

  const hasChanges =
    pages.some((p) => p.delta !== 0 || p.deleted) ||
    pages.some((p, i) => p.number !== i + 1);

  const save = async () => {
    const active = pages.filter((p) => !p.deleted);
    if (active.length === 0) { toast.error("Pelo menos uma página deve permanecer."); return; }
    setSaving(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      for (const p of active) {
        const [copied] = await out.copyPages(src, [p.number - 1]);
        const newDeg = ((p.existingDeg + p.delta) % 360 + 360) % 360;
        copied.setRotation(degrees(newDeg));
        out.addPage(copied);
      }
      const bytes = await out.save();
      setResultBytes(bytes);
      triggerBytesDownload(bytes, file.name.replace(/\.pdf$/i, "") + "-organizado.pdf");
      toast.success("PDF organizado salvo!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao organizar o PDF.");
    } finally {
      setSaving(false);
    }
  };

  const deletedCount = pages.filter((p) => p.deleted).length;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={13} /> Voltar
      </button>

      {/* File info + global rotate buttons */}
      <div className="p-3 border rounded-lg bg-muted/30 text-sm flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pageCount} página{pageCount !== 1 ? "s" : ""}
            {deletedCount > 0 && (
              <span className="ml-1 text-destructive">· {deletedCount} marcada{deletedCount !== 1 ? "s" : ""} para excluir</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta(allNums, -90)}>
            <RotateCcw size={12} /> Todas 90° E
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta(allNums, 90)}>
            <RotateCw size={12} /> Todas 90° D
          </Button>
        </div>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 border rounded-lg bg-primary/5">
          <span className="text-xs text-muted-foreground flex-1">
            {selected.size} página{selected.size !== 1 ? "s" : ""} selecionada{selected.size !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta([...selected], -90)}>
            <RotateCcw size={12} /> 90° E
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta([...selected], 90)}>
            <RotateCw size={12} /> 90° D
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyDelta([...selected], 180)}>
            180°
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resetDelta([...selected])}>
            Redefinir
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Arraste para reordenar · clique para selecionar múltiplas · X para excluir página
      </p>

      {/* Page grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {pages.map((p, i) => {
          const isSelected = selected.has(p.number);
          const rotated = p.delta % 180 !== 0;
          return (
            <motion.div
              key={p.number}
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
                "flex flex-col items-center gap-1",
                overIdx === i && dragIdx !== i && "ring-2 ring-primary ring-offset-2 rounded-lg",
              )}
            >
              <div className="relative w-full">
                {/* Drag handle */}
                <div className="absolute top-1 left-1 z-10 cursor-grab active:cursor-grabbing p-0.5 rounded bg-black/20 hover:bg-black/40 transition-colors">
                  <GripVertical size={10} className="text-white" />
                </div>

                {/* Delete button */}
                <button
                  onClick={() => toggleDelete(p.number)}
                  className={cn(
                    "absolute top-1 right-1 z-10 p-0.5 rounded transition-colors",
                    p.deleted
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-black/20 hover:bg-destructive hover:text-destructive-foreground text-white",
                  )}
                  title={p.deleted ? "Restaurar página" : "Excluir página"}
                >
                  <Trash2 size={10} />
                </button>

                {/* Page card */}
                <motion.button
                  onClick={() => toggle(p.number)}
                  animate={{ opacity: p.deleted ? 0.35 : 1 }}
                  whileDrag={{ scale: 1.05, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 50 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "relative w-full rounded-lg border-2 overflow-hidden transition-colors focus:outline-none",
                    isSelected ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-foreground/30",
                  )}
                >
                  <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {p.thumb ? (
                      <img
                        src={p.thumb}
                        alt={`Página ${p.number}`}
                        className="object-contain transition-transform duration-200"
                        style={{
                          transform: `rotate(${p.delta}deg)`,
                          maxWidth: rotated ? "70%" : "100%",
                          maxHeight: rotated ? "70%" : "100%",
                          width: rotated ? undefined : "100%",
                          height: rotated ? undefined : "100%",
                        }}
                      />
                    ) : (
                      <ThumbSkeleton className="w-full h-full" />
                    )}
                  </div>

                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <div className="bg-primary rounded-full p-0.5">
                        <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                      </div>
                    </div>
                  )}

                  {p.delta !== 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[9px] text-center py-0.5 font-medium">
                      +{p.delta}°
                    </div>
                  )}

                  {p.deleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                      <span className="text-[10px] font-bold text-destructive bg-background/80 px-1 rounded">excluir</span>
                    </div>
                  )}
                </motion.button>
              </div>

              <span className="text-[10px] text-muted-foreground">{p.number}</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => applyDelta([p.number], -90)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Girar 90° para a esquerda"
                >
                  <RotateCcw size={12} className="text-muted-foreground" />
                </button>
                {p.delta !== 0 && (
                  <button
                    onClick={() => resetDelta([p.number])}
                    className="px-1 rounded hover:bg-muted transition-colors text-[9px] text-muted-foreground font-medium"
                    title="Redefinir rotação"
                  >
                    ↺
                  </button>
                )}
                <button
                  onClick={() => applyDelta([p.number], 90)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Girar 90° para a direita"
                >
                  <RotateCw size={12} className="text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving || !hasChanges}>
        <Download size={15} />
        {saving ? "Salvando…" : "Baixar PDF organizado"}
      </Button>

      {resultBytes && (
        <Button variant="outline" onClick={() =>
          onUseResult(
            makePdfFile(resultBytes, file.name.replace(/\.pdf$/i, "") + "-organizado.pdf"),
            { toolLabel: "Organizar", originalName: file.name },
          )
        }>
          <ArrowRight size={15} />
          Continuar com este PDF
        </Button>
      )}
    </div>
  );
}
