"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileText, Scissors, FileImage, FileStack,
  ArrowLeft, LayoutGrid, Minimize2, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { type Mode, type MergeItem, type ChainSource } from "./types";
import { isPdf, isImage, fmt, ACCEPTED } from "./utils";
import { MergeView } from "./views/merge";
import { SplitView } from "./views/split";
import { OrganizeView } from "./views/organize";
import { CompressView } from "./views/compress";
import { ToImageView } from "./views/to-image";

// ─── shared small components ──────────────────────────────────────────────────

function DropZone({ onFiles, compact = false, label }: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  label?: string;
}) {
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
        "border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 select-none",
        over ? "border-primary bg-primary/5" : "border-foreground/20 hover:border-foreground/40",
        compact ? "py-4 px-6" : "py-16 px-8",
      )}
    >
      <FileText size={compact ? 20 : 36} className={cn("text-muted-foreground", over && "text-primary")} />
      <p className="text-sm text-muted-foreground text-center text-balance">
        {label ?? "Arraste PDFs ou imagens aqui"}
      </p>
      {!compact && (
        <p className="text-xs text-muted-foreground/60">Mesclar · Dividir · Organizar · Comprimir · Converter</p>
      )}
      <input ref={ref} type="file" accept={ACCEPTED} multiple className="hidden"
        onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

function ActionCard({ icon, title, description, onClick }: {
  icon: React.ReactNode; title: string; description: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-start gap-2 p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left w-full">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function PdfTool() {
  const [mode, setMode] = useState<Mode>("idle");
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  const [chosenPageCount, setChosenPageCount] = useState(0);
  const [mergeInitial, setMergeInitial] = useState<MergeItem[]>([]);
  const [chainSource, setChainSource] = useState<ChainSource | null>(null);

  const reset = useCallback(() => {
    setMode("idle");
    setChosenFile(null);
    setChosenPageCount(0);
    setMergeInitial([]);
    setChainSource(null);
  }, []);

  const backToChoosing = useCallback(() => {
    setMode("choosing");
  }, []);

  const handleUseResult = useCallback(async (file: File, source: ChainSource) => {
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      setChosenFile(file);
      setChosenPageCount(doc.getPageCount());
      setChainSource(source);
      setMode("choosing");
    } catch {
      toast.error("Não foi possível ler o PDF resultante.");
    }
  }, []);

  const handleInitialDrop = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => isPdf(f) || isImage(f));
    if (!valid.length) return;

    if (valid.length === 1 && isPdf(valid[0])) {
      try {
        const doc = await PDFDocument.load(await valid[0].arrayBuffer());
        setChosenFile(valid[0]);
        setChosenPageCount(doc.getPageCount());
        setChainSource(null);
        setMode("choosing");
      } catch {
        toast.error("Não foi possível ler o PDF.");
      }
      return;
    }

    // Multiple / image → straight to merge
    const items: MergeItem[] = await Promise.all(
      valid.map(async (file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        if (isPdf(file)) {
          let pageCount: number | undefined;
          try { pageCount = (await PDFDocument.load(await file.arrayBuffer())).getPageCount(); } catch { /**/ }
          return { id, file, kind: "pdf" as const, pageCount, thumbnail: null };
        } else {
          const thumbnail = URL.createObjectURL(file);
          return { id, file, kind: "image" as const, pageCount: 1, thumbnail };
        }
      }),
    );
    setMergeInitial(items);
    setMode("merge");
  }, []);

  const goMerge = useCallback(async () => {
    if (!chosenFile) return;
    try {
      const doc = await PDFDocument.load(await chosenFile.arrayBuffer());
      setMergeInitial([
        { id: `${chosenFile.name}-${Date.now()}`, file: chosenFile, kind: "pdf", pageCount: doc.getPageCount(), thumbnail: null },
      ]);
      setMode("merge");
    } catch {
      toast.error("Erro ao carregar PDF.");
    }
  }, [chosenFile]);

  return (
    <div className={cn("p-8 w-full min-h-screen", mode === "idle" && "flex items-center justify-center")}>
      <div className="w-full md:max-w-[600px] mx-auto">

        {mode === "idle" && <DropZone onFiles={handleInitialDrop} />}

        {mode === "choosing" && chosenFile && (
          <div className="flex flex-col gap-4">
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
              <ArrowLeft size={13} /> Novo arquivo
            </button>

            {chainSource && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                <ArrowRight size={12} />
                resultado de: <span className="font-medium text-foreground">{chainSource.toolLabel}</span>
                {chainSource.originalName && (
                  <span className="truncate max-w-[200px] opacity-70">({chainSource.originalName})</span>
                )}
              </div>
            )}

            <div className="p-4 border rounded-xl bg-muted/30 flex items-center gap-3">
              <FileText size={24} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{chosenFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(chosenFile.size)} · {chosenPageCount} página{chosenPageCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">O que deseja fazer?</p>
            <div className="grid grid-cols-2 gap-3">
              <ActionCard icon={<FileStack size={20} />} title="Mesclar"
                description="Combine com outros PDFs ou imagens" onClick={goMerge} />
              <ActionCard icon={<Scissors size={20} />} title="Dividir"
                description="Extraia ou separe páginas" onClick={() => setMode("split")} />
              <ActionCard icon={<LayoutGrid size={20} />} title="Organizar"
                description="Reordene, exclua e gire páginas" onClick={() => setMode("organize")} />
              <ActionCard icon={<Minimize2 size={20} />} title="Comprimir"
                description="Reduza o tamanho do arquivo" onClick={() => setMode("compress")} />
              <ActionCard icon={<FileImage size={20} />} title="Para imagem"
                description="Converta cada página em PNG" onClick={() => setMode("to-image")} />
            </div>
          </div>
        )}

        {mode === "merge" && (
          <MergeView initial={mergeInitial} onBack={reset} onUseResult={handleUseResult} />
        )}

        {mode === "split" && chosenFile && (
          <SplitView file={chosenFile} pageCount={chosenPageCount} onBack={backToChoosing} onUseResult={handleUseResult} />
        )}

        {mode === "to-image" && chosenFile && (
          <ToImageView file={chosenFile} onBack={backToChoosing} />
        )}

        {mode === "organize" && chosenFile && (
          <OrganizeView file={chosenFile} pageCount={chosenPageCount} onBack={backToChoosing} onUseResult={handleUseResult} />
        )}

        {mode === "compress" && chosenFile && (
          <CompressView file={chosenFile} pageCount={chosenPageCount} onBack={backToChoosing} onUseResult={handleUseResult} />
        )}

      </div>
    </div>
  );
}
