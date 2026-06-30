"use client";

import { useState, useEffect } from "react";
import { Download, Link, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fileToDataUrl, loadImage } from "../helpers";
import { BackBtn, BeforeAfter, ControlsBar } from "../shared";

type FitMode = "fill" | "contain" | "cover" | "none" | "scale-down" | "repeat";

const FIT_MODES: { value: FitMode; label: string; title: string }[] = [
  { value: "fill", label: "Esticar", title: "Estica a imagem para preencher exatamente as dimensões" },
  { value: "contain", label: "Conter", title: "Mantém proporção, encaixa dentro das dimensões (letterbox)" },
  { value: "cover", label: "Cobrir", title: "Mantém proporção, recorta para preencher as dimensões" },
  { value: "none", label: "Nenhum", title: "Não escala, centraliza no tamanho original" },
  { value: "scale-down", label: "Reduzir", title: "Como Conter, mas nunca amplia a imagem" },
  { value: "repeat", label: "Repetir", title: "Repete a imagem como um padrão de fundo" },
];

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function drawWithFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, fit: FitMode) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  ctx.clearRect(0, 0, w, h);
  switch (fit) {
    case "fill":
      ctx.drawImage(img, 0, 0, w, h);
      break;
    case "contain": {
      const scale = Math.min(w / iw, h / ih);
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      break;
    }
    case "cover": {
      const scale = Math.max(w / iw, h / ih);
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      break;
    }
    case "none":
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2);
      break;
    case "scale-down": {
      const scale = Math.min(1, Math.min(w / iw, h / ih));
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      break;
    }
    case "repeat": {
      const pattern = ctx.createPattern(img, "repeat");
      if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h); }
      break;
    }
  }
}

export function ResizeView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [locked, setLocked] = useState(true);
  const [fitMode, setFitMode] = useState<FitMode>("fill");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fileToDataUrl(file).then(loadImage).then((i) => {
      setImg(i);
      setWidth(String(i.naturalWidth));
      setHeight(String(i.naturalHeight));
    });
    return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ratio = img ? img.naturalWidth / img.naturalHeight : 1;

  const setW = (val: string) => {
    setWidth(val);
    if (locked && val) {
      const w = parseInt(val);
      if (!isNaN(w) && w > 0) setHeight(String(Math.round(w / ratio)));
    }
  };

  const setH = (val: string) => {
    setHeight(val);
    if (locked && val) {
      const h = parseInt(val);
      if (!isNaN(h) && h > 0) setWidth(String(Math.round(h * ratio)));
    }
  };

  const w = parseInt(width) || 0;
  const h = parseInt(height) || 0;

  const apply = () => {
    if (!img || w <= 0 || h <= 0) return;
    setProcessing(true);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    drawWithFit(canvas.getContext("2d")!, img, w, h, fitMode);
    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setResultSize(blob.size);
      setProcessing(false);
    }, "image/png");
  };

  const download = () => {
    if (!resultUrl) return;
    Object.assign(document.createElement("a"), { href: resultUrl, download: `redimensionada-${w}x${h}.png` }).click();
  };

  const originalLabel = img
    ? `Original — ${img.naturalWidth}×${img.naturalHeight} · ${fmtSize(file.size)}`
    : "Original";
  const resultLabel = resultUrl
    ? `Resultado — ${w}×${h}${resultSize !== null ? ` · ${fmtSize(resultSize)}` : ""}`
    : "Resultado";

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões</Label>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-muted-foreground">Largura (px)</Label>
              <Input
                type="number"
                min={1}
                value={width}
                onChange={(e) => setW(e.target.value)}
                className="font-mono"
              />
            </div>
            <button onClick={() => setLocked(!locked)} className="mt-5 p-2 rounded-lg border hover:bg-muted transition-colors">
              {locked ? <Link size={16} /> : <Unlink size={16} className="text-muted-foreground" />}
            </button>
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-muted-foreground">Altura (px)</Label>
              <Input
                type="number"
                min={1}
                value={height}
                onChange={(e) => setH(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preenchimento</Label>
          <div className="flex flex-wrap gap-1.5">
            {FIT_MODES.map(({ value, label, title }) => (
              <button
                key={value}
                title={title}
                onClick={() => setFitMode(value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  fitMode === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1" />
          <Button size="sm" onClick={apply} disabled={processing || w <= 0 || h <= 0}>Aplicar</Button>
          <Button size="sm" onClick={download} disabled={!resultUrl}>
            <Download size={14} /> Baixar
          </Button>
        </div>
      </ControlsBar>
      {img && (
        <BeforeAfter
          original={img}
          originalLabel={originalLabel}
          result={resultUrl}
          resultLabel={resultLabel}
        >
          <p className="text-sm text-muted-foreground">Clique em &ldquo;Aplicar&rdquo;</p>
        </BeforeAfter>
      )}
    </div>
  );
}
