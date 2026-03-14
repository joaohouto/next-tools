"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, Trash2, Sparkles, Copy, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import FileDropzone from "@/components/file-dropzone";
import { removeBackground } from "@imgly/background-removal";
import { toast } from "sonner";

const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundColor: "white",
};

export default function AIBackgroundRemover() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0, show: false });
  const processedImageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (processedImage) URL.revokeObjectURL(processedImage);
    };
  }, [processedImage]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== "string") return;
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        removeBackgroundAI(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const removeBackgroundAI = async (imageUrl: string) => {
    setIsProcessing(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? (clearInterval(progressInterval), 90) : prev + 10));
    }, 200);

    try {
      const blob = await removeBackground(imageUrl);
      clearInterval(progressInterval);
      setProgress(100);
      setProcessedImage(URL.createObjectURL(blob));
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Erro ao remover fundo:", error);
      toast.error("Erro ao processar imagem. Tente novamente.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement("a");
    link.download = "imagem-sem-fundo.png";
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
    if (processedImage) URL.revokeObjectURL(processedImage);
    setOriginalImage(null);
    setProcessedImage(null);
    setProgress(0);
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
            onUpload={(files) => files[0] && processFile(files[0])}
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

        {/* Progress / Actions bar */}
        <div className="rounded-2xl border bg-muted/20 p-4">
          {isProcessing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="size-4 animate-pulse text-blue-500" />
                  Processando com IA...
                </span>
                <span className="font-mono font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>
                <Trash2 className="size-3.5" />
                Nova imagem
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={copyImage} disabled={!processedImage}>
                <Copy className="size-3.5" />
                Copiar
              </Button>
              <Button size="sm" onClick={downloadImage} disabled={!processedImage}>
                <Download className="size-3.5" />
                Baixar
              </Button>
            </div>
          )}
        </div>

        {/* Before / After */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
            <div className="rounded-xl overflow-hidden border bg-muted/30">
              <img src={originalImage.src} alt="Original" className="w-full h-auto" />
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sem fundo
            </span>
            <div
              ref={processedImageRef}
              onMouseMove={handleZoomMove}
              onMouseLeave={() => setZoomPosition({ x: 0, y: 0, show: false })}
              className="relative rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center cursor-none"
              style={CHECKERBOARD}
            >
              {isProcessing ? (
                <Sparkles className="size-10 text-blue-500 animate-pulse" />
              ) : processedImage ? (
                <img src={processedImage} alt="Sem fundo" className="w-full h-auto" />
              ) : (
                <ImageIcon className="size-10 text-muted-foreground/20" />
              )}

              {/* Magnifier */}
              {zoomPosition.show && processedImage && !isProcessing && processedImageRef.current && (
                <>
                  {/* Checkerboard background layer */}
                  <div
                    className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      width: 160, height: 160,
                      left: zoomPosition.x - 80,
                      top: zoomPosition.y - 80,
                      zIndex: 10,
                      ...CHECKERBOARD,
                    }}
                  />
                  {/* Image zoom layer */}
                  <div
                    className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      width: 160, height: 160,
                      left: zoomPosition.x - 80,
                      top: zoomPosition.y - 80,
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
