"use client";

import React, { useState, useEffect } from "react";
import { Download, RefreshCw, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FileDropzone from "@/components/file-dropzone";
import Potrace from "potrace";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

export default function ImageVectorizer() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [vectorizedSVG, setVectorizedSVG] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const debouncedThreshold = useDebounce(threshold, 500);

  const handleFilesUpload = (files: File[]) => {
    if (files[0]) processFile(files[0]);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== "string") return;
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        vectorizeImage(result, threshold);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const vectorizeImage = async (imageData: string, thresholdValue: number) => {
    setIsProcessing(true);
    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      Potrace.trace(
        buffer,
        { threshold: thresholdValue, color: "#000000", background: "transparent", optTolerance: 0.2, turdSize: 2 },
        (err: Error | null, svg: string) => {
          if (err) {
            console.error("Erro ao vetorizar:", err);
            toast.error("Erro ao processar imagem. Tente outra imagem.");
          } else {
            setVectorizedSVG(svg);
          }
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar imagem. Tente novamente.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (originalImage) vectorizeImage(originalImage.src, debouncedThreshold);
  }, [debouncedThreshold]);

  const downloadSVG = () => {
    if (!vectorizedSVG) return;
    const url = URL.createObjectURL(new Blob([vectorizedSVG], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.download = "imagem-vetorizada.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copySVG = async () => {
    if (!vectorizedSVG) return;
    try {
      await navigator.clipboard.writeText(vectorizedSVG);
      toast.success("SVG copiado!");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      toast.error("Erro ao copiar SVG");
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setVectorizedSVG(null);
    setThreshold(128);
  };

  if (!originalImage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Converte imagens em vetores SVG monocromáticos.
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Threshold (Contraste)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={threshold}
                  onChange={(e) =>
                    setThreshold(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))
                  }
                  disabled={isProcessing}
                  className="w-20 h-7 font-mono text-sm"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              disabled={isProcessing}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-muted-foreground">
              Ajuste para controlar o nível de detalhes
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <Trash2 className="size-3.5" />
              Nova imagem
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={copySVG}
              disabled={!vectorizedSVG || isProcessing}
            >
              <Copy className="size-3.5" />
              Copiar SVG
            </Button>
            <Button
              size="sm"
              onClick={downloadSVG}
              disabled={!vectorizedSVG || isProcessing}
            >
              <Download className="size-3.5" />
              Baixar
            </Button>
          </div>
        </div>

        {/* Before / After */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Original
            </span>
            <div className="rounded-xl overflow-hidden border bg-muted/30">
              <img src={originalImage.src} alt="Original" className="w-full h-auto" />
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Vetorizado (SVG)
              {isProcessing && <RefreshCw className="size-3 animate-spin" />}
            </span>
            <div className="rounded-xl overflow-hidden border bg-white min-h-[200px] flex items-center justify-center">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="size-8 text-blue-500 animate-spin" />
                  <span className="text-sm text-muted-foreground">Vetorizando...</span>
                </div>
              ) : (
                vectorizedSVG && (
                  <div
                    dangerouslySetInnerHTML={{ __html: vectorizedSVG }}
                    className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full"
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
