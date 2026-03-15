"use client";

import { useState } from "react";
import { Copy, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FileDropzone from "@/components/file-dropzone";
import { toast } from "sonner";

function extractPalette(img: HTMLImageElement, count: number): string[] {
  const canvas = document.createElement("canvas");
  const MAX = 200;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const colorMap = new Map<string, number>();
  const STEP = 16; // quantization step

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent
    const r = Math.round(data[i]     / STEP) * STEP;
    const g = Math.round(data[i + 1] / STEP) * STEP;
    const b = Math.round(data[i + 2] / STEP) * STEP;
    // skip near-white and near-black
    const brightness = (r + g + b) / 3;
    if (brightness > 240 || brightness < 15) continue;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
  }

  return [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    });
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export default function PaletteExtractor() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [colorCount, setColorCount] = useState(8);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setPalette(extractPalette(img, colorCount));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleColorCountChange = (count: number) => {
    setColorCount(count);
    if (originalImage) setPalette(extractPalette(originalImage, count));
  };

  const copyColor = async (color: string) => {
    await navigator.clipboard.writeText(color);
    setCopiedColor(color);
    toast.success(`${color} copiado!`);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(palette.join(", "));
    toast.success("Paleta copiada!");
  };

  const reset = () => {
    setOriginalImage(null);
    setPalette([]);
  };

  if (!originalImage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Extrai as cores dominantes de qualquer imagem.
          </p>
          <FileDropzone onUpload={(files) => files[0] && processFile(files[0])} accept="image/*" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Controls */}
        <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Número de cores
              </Label>
              <span className="font-mono text-sm font-medium">{colorCount}</span>
            </div>
            <input
              type="range" min={4} max={16} value={colorCount}
              onChange={(e) => handleColorCountChange(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <Trash2 className="size-3.5" /> Nova imagem
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={copyAll} disabled={palette.length === 0}>
              <Copy className="size-3.5" /> Copiar paleta
            </Button>
          </div>
        </div>

        {/* Image + Palette */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imagem</span>
            <div className="rounded-xl overflow-hidden border bg-muted/30">
              <img src={originalImage.src} alt="Original" className="w-full h-auto" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Paleta extraída — {palette.length} cores
            </span>
            <div className="rounded-xl overflow-hidden border flex flex-col divide-y">
              {palette.map((color) => (
                <button
                  key={color}
                  onClick={() => copyColor(color)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:opacity-90 transition-opacity group"
                  style={{ backgroundColor: color }}
                >
                  <span
                    className="font-mono text-sm font-medium tracking-wide flex-1 text-left"
                    style={{ color: contrastColor(color) }}
                  >
                    {color.toUpperCase()}
                  </span>
                  {copiedColor === color
                    ? <Check className="size-3.5 opacity-70" style={{ color: contrastColor(color) }} />
                    : <Copy className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: contrastColor(color) }} />
                  }
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
