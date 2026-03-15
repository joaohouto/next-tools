"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, RefreshCw, Trash2, Pipette, Info, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FileDropzone from "@/components/file-dropzone";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundColor: "white",
};

export default function ColorRemover() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(30);
  const debouncedThreshold = useDebounce(threshold, 500);
  const [targetColor, setTargetColor] = useState("#ffffff");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0, show: false });
  const processedImageRef = useRef<HTMLDivElement | null>(null);

  const handleFilesUpload = (files: File[]) => {
    if (files && files.length > 0) processFile(files[0]);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          removeBackground(img, threshold, targetColor);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = (img: HTMLImageElement, thresholdValue: number, color: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { setIsProcessing(false); return; }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const targetR = parseInt(color.slice(1, 3), 16);
      const targetG = parseInt(color.slice(3, 5), 16);
      const targetB = parseInt(color.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        const diff = Math.sqrt(
          Math.pow(data[i] - targetR, 2) +
          Math.pow(data[i + 1] - targetG, 2) +
          Math.pow(data[i + 2] - targetB, 2)
        );
        if (diff < thresholdValue) data[i + 3] = 0;
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL("image/png"));
      setIsProcessing(false);
    }, 100);
  };

  useEffect(() => {
    if (originalImage) removeBackground(originalImage, debouncedThreshold, targetColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedThreshold]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setTargetColor(newColor);
    if (originalImage) removeBackground(originalImage, threshold, newColor);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPickingColor || !originalImage) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (originalImage.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (originalImage.height / rect.height));
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    const hexColor = "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
    setTargetColor(hexColor);
    setIsPickingColor(false);
    removeBackground(originalImage, threshold, hexColor);
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement("a");
    link.download = "imagem-sem-cor.png";
    link.href = processedImage;
    link.click();
  };

  const copyImage = async () => {
    if (!processedImage) return;
    try {
      const blob = await fetch(processedImage).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("Imagem copiada!");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      toast.error("Erro ao copiar imagem");
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setThreshold(30);
    setTargetColor("#ffffff");
    setIsPickingColor(false);
  };

  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!processedImageRef.current) return;
    const rect = processedImageRef.current.getBoundingClientRect();
    setZoomPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top, show: true });
  };

  if (!originalImage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Processado no seu dispositivo, sem enviar para servidores.
            </p>
          </div>
          <FileDropzone
            onUpload={handleFilesUpload}
            accept="image/*"
            isLoading={isProcessing}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Controls bar */}
        <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Color picker */}
            <div className="flex-1 flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cor para remover
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={targetColor}
                  onChange={handleColorChange}
                  className="w-9 h-9 rounded-lg cursor-pointer border"
                />
                <Input
                  type="text"
                  value={targetColor}
                  onChange={handleColorChange}
                  placeholder="#ffffff"
                  className="flex-1 font-mono h-9"
                />
                <Button
                  variant={isPickingColor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPickingColor(!isPickingColor)}
                >
                  <Pipette className="size-3.5" />
                  <span className="hidden sm:inline">
                    {isPickingColor ? "Cancelar" : "Conta-gotas"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:items-end">
              <Button variant="outline" size="sm" onClick={reset}>
                <Trash2 className="size-3.5" />
                Nova imagem
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={copyImage}
                disabled={!processedImage || isProcessing}
              >
                <Copy className="size-3.5" />
                Copiar
              </Button>
              <Button
                size="sm"
                onClick={downloadImage}
                disabled={!processedImage || isProcessing}
              >
                <Download className="size-3.5" />
                Baixar
              </Button>
            </div>
          </div>

          {/* Tolerance slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tolerância
              </Label>
              <span className="font-mono text-sm font-medium">{threshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-muted-foreground">
              Ajuste para remover tons similares à cor selecionada
            </span>
          </div>
        </div>

        {/* Before / After */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Original
            </span>
            <div
              className={`relative rounded-xl overflow-hidden border bg-muted/30 transition-all ${
                isPickingColor ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <img
                src={originalImage.src}
                alt="Original"
                className={`w-full h-auto ${isPickingColor ? "cursor-crosshair" : ""}`}
                onClick={handleImageClick}
              />
              {isPickingColor && (
                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none flex items-center justify-center">
                  <div className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-full flex gap-2 items-center">
                    <Info className="size-3.5" />
                    Clique para selecionar a cor
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Sem cor
              {isProcessing && <RefreshCw className="size-3 animate-spin" />}
            </span>
            <div
              ref={processedImageRef}
              onMouseMove={handleZoomMove}
              onMouseLeave={() => setZoomPosition({ x: 0, y: 0, show: false })}
              className="relative rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center cursor-none"
              style={CHECKERBOARD}
            >
              {processedImage && (
                <img src={processedImage} alt="Processado" className="w-full h-auto" />
              )}

              {/* Magnifier */}
              {zoomPosition.show && processedImage && processedImageRef.current && (
                <>
                  <div
                    className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      width: 160, height: 160,
                      left: zoomPosition.x - 80, top: zoomPosition.y - 80,
                      zIndex: 10,
                      ...CHECKERBOARD,
                    }}
                  />
                  <div
                    className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      width: 160, height: 160,
                      left: zoomPosition.x - 80, top: zoomPosition.y - 80,
                      zIndex: 20,
                      backgroundImage: `url(${processedImage})`,
                      backgroundSize: `${processedImageRef.current.offsetWidth * 3}px ${processedImageRef.current.offsetHeight * 3}px`,
                      backgroundPosition: `-${zoomPosition.x * 3 - 80}px -${zoomPosition.y * 3 - 80}px`,
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
      </div>
    </div>
  );
}
