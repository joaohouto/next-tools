"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fileToDataUrl, loadImage } from "../helpers";
import { BackBtn, ControlsBar } from "../shared";

function extractPalette(img: HTMLImageElement, count: number): string[] {
  const canvas = document.createElement("canvas");
  const MAX = 200;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const map = new Map<string, number>();
  const STEP = 16;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = Math.round(data[i] / STEP) * STEP, g = Math.round(data[i + 1] / STEP) * STEP, b = Math.round(data[i + 2] / STEP) * STEP;
    const brightness = (r + g + b) / 3;
    if (brightness > 240 || brightness < 15) continue;
    const key = `${r},${g},${b}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([key]) => {
    const [r, g, b] = key.split(",").map(Number);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  });
}

function contrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000000" : "#ffffff";
}

export function PaletteView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [count, setCount] = useState(8);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fileToDataUrl(file).then(async (src) => { const i = await loadImage(src); setImg(i); setPalette(extractPalette(i, 8)); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeCount = (n: number) => { setCount(n); if (img) setPalette(extractPalette(img, n)); };

  const copyOne = async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    setCopied(hex); toast.success(`${hex} copiado!`);
    setTimeout(() => setCopied(null), 1500);
  };
  const copyAll = () => { navigator.clipboard.writeText(palette.join(", ")); toast.success("Paleta copiada!"); };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número de cores</Label>
            <span className="font-mono text-sm font-medium">{count}</span>
          </div>
          <input type="range" min={4} max={16} value={count} onChange={(e) => changeCount(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={copyAll} disabled={palette.length === 0}>
            <Copy size={14} /> Copiar paleta
          </Button>
        </div>
      </ControlsBar>
      {img && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imagem</span>
            <div className="rounded-xl overflow-hidden border bg-muted/30"><img src={img.src} alt="" className="w-full h-auto" /></div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paleta — {palette.length} cores</span>
            <div className="rounded-xl overflow-hidden border flex flex-col divide-y">
              {palette.map((hex) => (
                <button key={hex} onClick={() => copyOne(hex)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:opacity-90 transition-opacity group" style={{ backgroundColor: hex }}>
                  <span className="font-mono text-sm font-medium tracking-wide flex-1 text-left" style={{ color: contrastColor(hex) }}>{hex.toUpperCase()}</span>
                  {copied === hex
                    ? <Check size={14} className="opacity-70" style={{ color: contrastColor(hex) }} />
                    : <Copy size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: contrastColor(hex) }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
