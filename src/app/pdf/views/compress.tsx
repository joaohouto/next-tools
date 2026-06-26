"use client";

import { useState } from "react";
import { Download, ArrowLeft, ArrowRight, Loader2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PDFDocument } from "pdf-lib";
import { Label } from "@/components/ui/label";
import { type CompressQuality, type ViewProps } from "../types";
import { getPdfjs, fmt, makePdfFile, triggerBytesDownload } from "../utils";

const COMPRESS_PRESETS: Record<CompressQuality, { scale: number; jpeg: number; label: string; desc: string }> = {
  low:    { scale: 1.0, jpeg: 0.45, label: "Baixa",  desc: "Menor arquivo, qualidade reduzida" },
  medium: { scale: 1.5, jpeg: 0.70, label: "Média",  desc: "Equilíbrio entre tamanho e qualidade" },
  high:   { scale: 2.0, jpeg: 0.88, label: "Alta",   desc: "Boa qualidade, redução moderada" },
};

export function CompressView({ file, pageCount, onBack, onUseResult }: ViewProps) {
  const [quality, setQuality] = useState<CompressQuality>("medium");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ bytes: Uint8Array; size: number } | null>(null);

  const compress = async () => {
    setCompressing(true);
    setProgress(0);
    setResult(null);
    try {
      const preset = COMPRESS_PRESETS[quality as CompressQuality];
      const pdfjs = await getPdfjs();
      const bytes = await file.arrayBuffer();
      const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
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

      const outBytes = await out.save();
      setResult({ bytes: outBytes, size: outBytes.byteLength });
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
          A compressão rasteriza o PDF — ideal para documentos escaneados e PDFs com muitas imagens.
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
            reduction !== null && reduction > 0
              ? "bg-green-500/10 border-green-500/30 dark:border-green-500/20"
              : "bg-muted/30",
          )}
        >
          <div>
            <p className="font-medium">{fmt(result.size)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {reduction !== null && reduction > 0
                ? `${reduction}% menor que o original`
                : reduction !== null && reduction < 0
                ? `${Math.abs(reduction)}% maior que o original`
                : "Mesmo tamanho do original"}
            </p>
          </div>
          {reduction !== null && reduction > 0 && (
            <span className="text-green-600 dark:text-green-400 font-bold text-lg">−{reduction}%</span>
          )}
        </div>
      )}

      <Button onClick={compress} disabled={compressing}>
        {compressing ? <Loader2 size={15} className="animate-spin" /> : <Minimize2 size={15} />}
        {compressing ? "Comprimindo…" : "Comprimir"}
      </Button>

      {result && (
        <>
          <Button variant="outline" onClick={download}>
            <Download size={15} />
            Baixar PDF comprimido
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
