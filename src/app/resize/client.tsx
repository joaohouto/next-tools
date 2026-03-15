"use client";

import { useState, useEffect } from "react";
import { Download, Trash2, Link, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileDropzone from "@/components/file-dropzone";

export default function ImageResizer() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [locked, setLocked] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
        setResizedUrl(null);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const resize = () => {
    if (!originalImage || !width || !height) return;
    setIsProcessing(true);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(originalImage, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) { setIsProcessing(false); return; }
      if (resizedUrl) URL.revokeObjectURL(resizedUrl);
      setResizedUrl(URL.createObjectURL(blob));
      setIsProcessing(false);
    }, "image/png");
  };

  const handleWidthChange = (val: number) => {
    const w = Math.max(1, val);
    setWidth(w);
    if (locked && originalImage) setHeight(Math.round(w / (originalImage.naturalWidth / originalImage.naturalHeight)));
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(1, val);
    setHeight(h);
    if (locked && originalImage) setWidth(Math.round(h * (originalImage.naturalWidth / originalImage.naturalHeight)));
  };

  const download = () => {
    if (!resizedUrl) return;
    const link = document.createElement("a");
    link.download = `redimensionada-${width}x${height}.png`;
    link.href = resizedUrl;
    link.click();
  };

  const reset = () => {
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    setOriginalImage(null);
    setResizedUrl(null);
    setWidth(0);
    setHeight(0);
  };

  if (!originalImage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Processado no seu dispositivo, sem enviar para servidores.
          </p>
          <FileDropzone onUpload={(files) => files[0] && processFile(files[0])} accept="image/*" isLoading={isProcessing} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Controls */}
        <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4">

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões</Label>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <Label className="text-xs text-muted-foreground">Largura (px)</Label>
                <Input
                  type="number" min={1} value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="font-mono"
                />
              </div>

              <button
                onClick={() => setLocked(!locked)}
                className="mt-5 p-2 rounded-lg border hover:bg-muted transition-colors"
                title={locked ? "Travar proporção" : "Destravar proporção"}
              >
                {locked ? <Link className="size-4" /> : <Unlink className="size-4 text-muted-foreground" />}
              </button>

              <div className="flex flex-col gap-1 flex-1">
                <Label className="text-xs text-muted-foreground">Altura (px)</Label>
                <Input
                  type="number" min={1} value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Original: {originalImage.naturalWidth} × {originalImage.naturalHeight} px
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <Trash2 className="size-3.5" /> Nova imagem
            </Button>
            <div className="flex-1" />
            <Button size="sm" onClick={resize} disabled={isProcessing}>
              Aplicar
            </Button>
            <Button size="sm" onClick={download} disabled={!resizedUrl} variant="outline">
              <Download className="size-3.5" /> Baixar
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Original — {originalImage.naturalWidth}×{originalImage.naturalHeight}
            </span>
            <div className="rounded-xl overflow-hidden border bg-muted/30">
              <img src={originalImage.src} alt="Original" className="w-full h-auto" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resultado{resizedUrl ? ` — ${width}×${height}` : ""}
            </span>
            <div className="rounded-xl overflow-hidden border bg-muted/30 min-h-[200px] flex items-center justify-center">
              {resizedUrl
                ? <img src={resizedUrl} alt="Redimensionada" className="w-full h-auto" />
                : <p className="text-sm text-muted-foreground">Clique em "Aplicar"</p>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
