"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Download, ArrowLeft, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type RenderedPage } from "../types";
import { getPdfjs } from "../utils";

function dataUrlToSvg(page: RenderedPage): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">\n  <image xlink:href="${page.dataUrl}" x="0" y="0" width="${page.width}" height="${page.height}"/>\n</svg>`;
}

interface ToImageViewProps {
  file: File;
  onBack: () => void;
}

export function ToImageView({ file, onBack }: ToImageViewProps) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<"png" | "svg">("png");
  const fileRef = useRef(file);

  const render = useCallback(async (f: File, s: number) => {
    setRendering(true);
    setPages([]);
    try {
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: s });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        setPages((prev) => [...prev, { number: i, dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height }]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao converter o PDF.");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => { render(fileRef.current, scale); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeScale = (v: number[]) => { setScale(v[0]); render(fileRef.current, v[0]); };

  const copyToClipboard = async (page: RenderedPage) => {
    try {
      const blob = await (await fetch(page.dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success(`Página ${page.number} copiada!`);
    } catch {
      toast.error("Não foi possível copiar a imagem.");
    }
  };

  const download = (page: RenderedPage) => {
    const name = file.name.replace(/\.pdf$/i, "");
    if (format === "svg") {
      const svgContent = dataUrlToSvg(page);
      const url = URL.createObjectURL(new Blob([svgContent], { type: "image/svg+xml" }));
      Object.assign(document.createElement("a"), { href: url, download: `${name}-p${page.number}.svg` }).click();
      URL.revokeObjectURL(url);
    } else {
      Object.assign(document.createElement("a"), { href: page.dataUrl, download: `${name}-p${page.number}.png` }).click();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Qualidade · {scale}×</Label>
        <Slider min={1} max={4} step={0.5} value={[scale]}
          onValueChange={changeScale} disabled={rendering} />
        <p className="text-xs text-muted-foreground">1× = 72 dpi · 2× = 144 dpi · 4× = 288 dpi</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Formato de exportação</Label>
        <div className="flex gap-2">
          {(["png", "svg"] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg border text-sm font-medium transition-all",
                format === f ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/40",
              )}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        {format === "svg" && (
          <p className="text-xs text-muted-foreground">SVG com imagem rasterizada embutida (compatível com editores vetoriais)</p>
        )}
      </div>

      {rendering && pages.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" /> Convertendo…
        </div>
      )}

      {pages.length > 0 && (
        <>
          <Button onClick={() => pages.forEach(download)} disabled={rendering}>
            <Download size={15} />
            {rendering
              ? `Convertendo… (${pages.length})`
              : `Baixar todas (${pages.length} ${format.toUpperCase()})`}
          </Button>
          <div className="flex flex-col gap-3">
            {pages.map((page) => (
              <div key={page.number} className="border rounded-xl overflow-hidden">
                <img src={page.dataUrl} alt={`Página ${page.number}`} className="w-full h-auto" />
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <span className="text-xs text-muted-foreground">Página {page.number}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(page)}>
                      <Copy size={12} /> Copiar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => download(page)}>
                      <Download size={12} /> {format.toUpperCase()}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
