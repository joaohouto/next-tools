"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Copy, Pipette, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { CHECKERBOARD } from "../types";
import { fileToDataUrl, loadImage } from "../helpers";
import { BackBtn, ControlsBar } from "../shared";
import { Spinner } from "@/components/spinner";

export function RemoveColorView({
  file,
  onBack,
}: {
  file: File;
  onBack: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [color, setColor] = useState("#ffffff");
  const [threshold, setThreshold] = useState(30);
  const debouncedThreshold = useDebounce(threshold, 400);
  const [processing, setProcessing] = useState(false);
  const [picking, setPicking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0, show: false });

  useEffect(() => {
    fileToDataUrl(file).then(async (src) => {
      const i = await loadImage(src);
      setImg(i);
      removeColor(i, threshold, color);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (img) removeColor(img, debouncedThreshold, color);
  }, [debouncedThreshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeColor = (image: HTMLImageElement, thr: number, hex: string) => {
    setProcessing(true);
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = data.data;
      const tr = parseInt(hex.slice(1, 3), 16),
        tg = parseInt(hex.slice(3, 5), 16),
        tb = parseInt(hex.slice(5, 7), 16);
      for (let i = 0; i < d.length; i += 4) {
        if (
          Math.sqrt(
            (d[i] - tr) ** 2 + (d[i + 1] - tg) ** 2 + (d[i + 2] - tb) ** 2,
          ) < thr
        )
          d[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      setResult(canvas.toDataURL("image/png"));
      setProcessing(false);
    }, 50);
  };

  const pickColor = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!picking || !img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (img.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (img.height / rect.height));
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
    setColor(hex);
    setPicking(false);
    removeColor(img, threshold, hex);
  };

  const handleColorChange = (hex: string) => {
    setColor(hex);
    if (img) removeColor(img, threshold, hex);
  };

  const download = () => {
    if (!result) return;
    Object.assign(document.createElement("a"), {
      href: result,
      download: "sem-cor.png",
    }).click();
  };
  const copy = async () => {
    if (!result) return;
    try {
      const blob = await fetch(result).then((r) => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success("Copiado!");
    } catch {
      toast.error("Erro ao copiar.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cor para remover
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 font-mono h-9"
                placeholder="#ffffff"
              />
              <Button
                variant={picking ? "default" : "outline"}
                size="sm"
                onClick={() => setPicking(!picking)}
              >
                <Pipette size={14} />{" "}
                <span className="hidden sm:inline">
                  {picking ? "Cancelar" : "Conta-gotas"}
                </span>
              </Button>
            </div>
          </div>
          <div className="flex gap-2 sm:items-end flex-wrap">
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              disabled={!result || processing}
            >
              <Copy size={14} /> Copiar
            </Button>
            <Button
              size="sm"
              onClick={download}
              disabled={!result || processing}
            >
              <Download size={14} /> Baixar
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tolerância
            </Label>
            <span className="font-mono text-sm font-medium">{threshold}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </ControlsBar>
      {img && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Original
            </span>
            <div
              className={cn(
                "relative rounded-xl overflow-hidden border bg-muted/30",
                picking && "ring-2 ring-blue-500",
              )}
            >
              <img
                src={img.src}
                alt=""
                className={cn("w-full h-auto", picking && "cursor-crosshair")}
                onClick={pickColor}
              />
              {picking && (
                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none flex items-center justify-center">
                  <div className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-full flex gap-2 items-center">
                    <Info size={14} /> Clique para selecionar a cor
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Sem cor {processing && <Spinner className="size-4" />}
            </span>
            <div
              ref={containerRef}
              onMouseMove={(e) => {
                if (!containerRef.current) return;
                const r = containerRef.current.getBoundingClientRect();
                setZoom({
                  x: e.clientX - r.left,
                  y: e.clientY - r.top,
                  show: true,
                });
              }}
              onMouseLeave={() => setZoom({ x: 0, y: 0, show: false })}
              className="relative rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center cursor-none"
              style={CHECKERBOARD}
            >
              {result && <img src={result} alt="" className="w-full h-auto" />}
              {zoom.show && result && containerRef.current && (
                <>
                  <div
                    className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      width: 160,
                      height: 160,
                      left: zoom.x - 80,
                      top: zoom.y - 80,
                      zIndex: 10,
                      ...CHECKERBOARD,
                    }}
                  />
                  <div
                    className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      width: 160,
                      height: 160,
                      left: zoom.x - 80,
                      top: zoom.y - 80,
                      zIndex: 20,
                      backgroundImage: `url(${result})`,
                      backgroundSize: `${containerRef.current.offsetWidth * 3}px ${containerRef.current.offsetHeight * 3}px`,
                      backgroundPosition: `-${zoom.x * 3 - 80}px -${zoom.y * 3 - 80}px`,
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500/60" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/60" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/60" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
