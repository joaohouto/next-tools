"use client";

import { useState } from "react";
import { Download, ArrowLeft, ArrowRight, Minimize2 } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PDFDocument } from "pdf-lib";
import { Label } from "@/components/ui/label";
import { type CompressQuality, type ViewProps } from "../types";
import { getPdfjs, fmt, makePdfFile, triggerBytesDownload } from "../utils";

const COMPRESS_PRESETS: Record<CompressQuality, { scale: number; jpeg: number; label: string; desc: string }> = {
  low:    { scale: 0.5,  jpeg: 0.50, label: "Baixa",  desc: "Máxima compressão, qualidade reduzida" },
  medium: { scale: 0.75, jpeg: 0.72, label: "Média",  desc: "Equilíbrio entre tamanho e qualidade" },
  high:   { scale: 1.0,  jpeg: 0.85, label: "Alta",   desc: "Boa qualidade, compressão moderada" },
};

type CompressSource = "original" | "lossless" | "raster";

export function CompressView({ file, pageCount, onBack, onUseResult }: ViewProps) {
  const [quality, setQuality] = useState<CompressQuality>("medium");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ bytes: Uint8Array; size: number; source: CompressSource } | null>(null);

  const compress = async () => {
    setCompressing(true);
    setProgress(0);
    setResult(null);
    try {
      const preset = COMPRESS_PRESETS[quality as CompressQuality];
      const originalBytes = new Uint8Array(await file.arrayBuffer());

      // Strategy 1: lossless object-stream compression (preserves text and vectors)
      const losslessDoc = await PDFDocument.load(originalBytes);
      const losslessBytes = await losslessDoc.save({ useObjectStreams: true });

      // Strategy 2: rasterization with corrected scale (≤1.0, never upsamples)
      const pdfjs = await getPdfjs();
      const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(originalBytes) }).promise;
      const out = await PDFDocument.create();

      for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const naturalVp = page.getViewport({ scale: 1.0 });
        const vp = page.getViewport({ scale: preset.scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;

        const jpegBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? blob.arrayBuffer().then(resolve) : reject(new Error("blob"))),
            "image/jpeg",
            preset.jpeg,
          );
        });

        const img = await out.embedJpg(jpegBytes);
        const pdfPage = out.addPage([naturalVp.width, naturalVp.height]);
        pdfPage.drawImage(img, { x: 0, y: 0, width: naturalVp.width, height: naturalVp.height });
        setProgress(i);
      }

      const rasterBytes = await out.save({ useObjectStreams: true });

      // Pick the smallest result among original, lossless, and rasterized
      const candidates: { bytes: Uint8Array; source: CompressSource }[] = [
        { bytes: originalBytes, source: "original" },
        { bytes: losslessBytes, source: "lossless" },
        { bytes: rasterBytes, source: "raster" },
      ];
      const best = candidates.reduce((a, b) => a.bytes.byteLength <= b.bytes.byteLength ? a : b);

      setResult({ bytes: best.bytes, size: best.bytes.byteLength, source: best.source });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao comprimir o PDF.");
    } finally {
      setCompressing(false);
    }
  };

  const download = () => {
    if (!result) return;
    triggerBytesDownload(result.bytes, file.name.replace(/\.pdf$/i, "") + "-compressed.pdf");
    toast.success("PDF comprimido baixado!");
  };

  const reduction = result ? Math.round((1 - result.size / file.size) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmt(file.size)} · {pageCount} página{pageCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Qualidade de compressão</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(COMPRESS_PRESETS) as [CompressQuality, typeof COMPRESS_PRESETS[CompressQuality]][]).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => { setQuality(key); setResult(null); }}
                disabled={compressing}
                className={cn(
                  "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                  quality === key
                    ? "border-primary bg-primary/5"
                    : "hover:border-foreground/40 disabled:opacity-50",
                )}
              >
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{preset.desc}</span>
              </button>
            ),
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Testa compressão sem perdas e com rasterização — retorna automaticamente o menor resultado.
        </p>
      </div>

      {compressing && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${pageCount > 0 ? (progress / pageCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Comprimindo página {progress} de {pageCount}…
          </p>
        </div>
      )}

      {result && (
        <div
          className={cn(
            "p-3 border rounded-lg text-sm flex items-center justify-between",
            result.source === "original"
              ? "bg-muted/30"
              : "bg-green-500/10 border-green-500/30 dark:border-green-500/20",
          )}
        >
          <div>
            <p className="font-medium">{fmt(result.size)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.source === "original"
                ? "Este PDF já está no tamanho mínimo"
                : reduction !== null && reduction > 0
                ? `${reduction}% menor que o original${result.source === "lossless" ? " · sem perda de qualidade" : ""}`
                : "Mesmo tamanho do original"}
            </p>
          </div>
          {result.source !== "original" && reduction !== null && reduction > 0 && (
            <span className="text-green-600 dark:text-green-400 font-bold text-lg">−{reduction}%</span>
          )}
        </div>
      )}

      <Button onClick={compress} disabled={compressing}>
        {compressing ? <Spinner className="size-3.5" /> : <Minimize2 size={15} />}
        {compressing ? "Comprimindo…" : "Comprimir"}
      </Button>

      {result && (
        <>
          <Button variant="outline" onClick={download}>
            <Download size={15} />
            {result.source === "original" ? "Baixar PDF original" : "Baixar PDF comprimido"}
          </Button>
          <Button variant="ghost" onClick={() =>
            onUseResult(
              makePdfFile(result.bytes, file.name.replace(/\.pdf$/i, "") + "-compressed.pdf"),
              { toolLabel: "Comprimir", originalName: file.name },
            )
          }>
            <ArrowRight size={15} />
            Continuar com este PDF
          </Button>
        </>
      )}
    </div>
  );
}

// re-export type for client.tsx convenience
export { COMPRESS_PRESETS };
