"use client";

import { useState, useEffect } from "react";
import { Download, Link, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToDataUrl, loadImage } from "../helpers";
import { BackBtn, BeforeAfter, ControlsBar } from "../shared";

export function ResizeView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [locked, setLocked] = useState(true);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fileToDataUrl(file).then(loadImage).then((i) => { setImg(i); setWidth(i.naturalWidth); setHeight(i.naturalHeight); });
    return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ratio = img ? img.naturalWidth / img.naturalHeight : 1;

  const setW = (w: number) => { setWidth(w); if (locked) setHeight(Math.round(w / ratio)); };
  const setH = (h: number) => { setHeight(h); if (locked) setWidth(Math.round(h * ratio)); };

  const apply = () => {
    if (!img || !width || !height) return;
    setProcessing(true);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setProcessing(false);
    }, "image/png");
  };

  const download = () => {
    if (!resultUrl) return;
    Object.assign(document.createElement("a"), { href: resultUrl, download: `redimensionada-${width}x${height}.png` }).click();
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões</Label>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-muted-foreground">Largura (px)</Label>
              <Input type="number" min={1} value={width} onChange={(e) => setW(Number(e.target.value))} className="font-mono" />
            </div>
            <button onClick={() => setLocked(!locked)} className="mt-5 p-2 rounded-lg border hover:bg-muted transition-colors">
              {locked ? <Link size={16} /> : <Unlink size={16} className="text-muted-foreground" />}
            </button>
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-muted-foreground">Altura (px)</Label>
              <Input type="number" min={1} value={height} onChange={(e) => setH(Number(e.target.value))} className="font-mono" />
            </div>
          </div>
          {img && <p className="text-xs text-muted-foreground">Original: {img.naturalWidth} × {img.naturalHeight} px</p>}
        </div>
        <div className="flex gap-2">
          <div className="flex-1" />
          <Button size="sm" onClick={apply} disabled={processing}>Aplicar</Button>
          <Button size="sm" onClick={download} disabled={!resultUrl}>
            <Download size={14} /> Baixar
          </Button>
        </div>
      </ControlsBar>
      {img && (
        <BeforeAfter original={img} result={resultUrl} resultLabel={resultUrl ? `Resultado — ${width}×${height}` : "Resultado"}>
          <p className="text-sm text-muted-foreground">Clique em &ldquo;Aplicar&rdquo;</p>
        </BeforeAfter>
      )}
    </div>
  );
}
