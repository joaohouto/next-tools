"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileDropzone from "@/components/file-dropzone";
import { toast } from "sonner";
import { CardAnimatedBorder } from "@/components/card-animated-border";

function parsePageRanges(input: string, total: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr);
      const end = parseInt(endStr);
      if (isNaN(start) || isNaN(end)) continue;
      for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
        pages.add(i);
      }
    } else {
      const n = parseInt(part);
      if (!isNaN(n) && n >= 1 && n <= total) {
        pages.add(n);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [range, setRange] = useState("");
  const [splitting, setSplitting] = useState(false);

  const handleUpload = useCallback(async (files: File[]) => {
    const pdf = files.find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (!pdf) {
      toast.error("Selecione um arquivo PDF.");
      return;
    }

    try {
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setFile(pdf);
      setPageCount(doc.getPageCount());
      setRange(`1-${doc.getPageCount()}`);
    } catch {
      toast.error("Não foi possível ler o PDF.");
    }
  }, []);

  const split = async () => {
    if (!file) return;

    const pages = parsePageRanges(range, pageCount);
    if (pages.length === 0) {
      toast.error("Nenhuma página válida especificada.");
      return;
    }

    setSplitting(true);
    try {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();

      const indices = pages.map((p) => p - 1);
      const copied = await out.copyPages(src, indices);
      copied.forEach((page) => out.addPage(page));

      const pdfBytes = await out.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}-split.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${pages.length} página${pages.length !== 1 ? "s" : ""} exportada${pages.length !== 1 ? "s" : ""}!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao dividir o PDF.");
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col gap-4">
        <FileDropzone
          onUpload={handleUpload}
          accept="application/pdf,.pdf"
          label="Arraste ou clique para adicionar um PDF"
        />

        {!file ? (
          <CardAnimatedBorder className="!w-full text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center gap-2">
            <Scissors size={32} />
            <span className="text-sm">Nenhum PDF carregado</span>
          </CardAnimatedBorder>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 border rounded-lg bg-muted/30 text-sm">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {pageCount} página{pageCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="range">Páginas a extrair</Label>
              <Input
                id="range"
                placeholder="Ex: 1-3, 5, 7-9"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separe intervalos com vírgula. Ex: <code>1-3, 5, 8-10</code>
              </p>
              {range && (
                <p className="text-xs text-muted-foreground">
                  {parsePageRanges(range, pageCount).length} página{parsePageRanges(range, pageCount).length !== 1 ? "s" : ""} selecionada{parsePageRanges(range, pageCount).length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <Button onClick={split} disabled={splitting || !range.trim()} className="w-full">
              <Download size={16} />
              {splitting ? "Dividindo..." : "Baixar páginas selecionadas"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
