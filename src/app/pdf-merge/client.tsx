"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Trash2, ArrowUp, ArrowDown, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/file-dropzone";
import { toast } from "sonner";
import { CardAnimatedBorder } from "@/components/card-animated-border";

interface PdfItem {
  id: string;
  file: File;
  pageCount?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfMerge() {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [merging, setMerging] = useState(false);

  const addFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (pdfs.length === 0) {
      toast.error("Selecione apenas arquivos PDF.");
      return;
    }

    const newItems: PdfItem[] = await Promise.all(
      pdfs.map(async (file) => {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        try {
          const bytes = await file.arrayBuffer();
          const pdf = await PDFDocument.load(bytes);
          return { id, file, pageCount: pdf.getPageCount() };
        } catch {
          return { id, file };
        }
      }),
    );

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const moveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setItems((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const merge = async () => {
    if (items.length < 2) {
      toast.error("Adicione pelo menos 2 PDFs para mesclar.");
      return;
    }

    setMerging(true);
    try {
      const merged = await PDFDocument.create();

      for (const item of items) {
        const bytes = await item.file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const indices = src.getPageIndices();
        const copied = await merged.copyPages(src, indices);
        copied.forEach((page) => merged.addPage(page));
      }

      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("PDFs mesclados com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao mesclar PDFs. Verifique os arquivos.");
    } finally {
      setMerging(false);
    }
  };

  const totalPages = items.reduce((sum, i) => sum + (i.pageCount ?? 0), 0);

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col gap-4">
        <FileDropzone
          onUpload={addFiles}
          accept="application/pdf,.pdf"
          label="Arraste ou clique para adicionar PDFs"
          multiple
        />

        {items.length === 0 ? (
          <CardAnimatedBorder className="!w-full text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center gap-2">
            <FileStack size={32} />
            <span className="text-sm">Nenhum PDF adicionado</span>
          </CardAnimatedBorder>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {items.length} arquivo{items.length !== 1 ? "s" : ""} · {totalPages} página{totalPages !== 1 ? "s" : ""} no total
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveDown(index)}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown size={12} />
                    </Button>
                  </div>

                  <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.pageCount !== undefined && ` · ${item.pageCount} página${item.pageCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={merge} disabled={merging || items.length < 2} className="w-full">
              <Download size={16} />
              {merging ? "Mesclando..." : `Mesclar ${items.length} PDFs`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
