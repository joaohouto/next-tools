"use client";

import React, { useState, useRef } from "react";
import { Download, RefreshCw, Trash2, Sparkles, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import FileDropzone from "@/components/file-dropzone";
import { removeBackground } from "@imgly/background-removal";
import { toast } from "sonner";

export default function AIBackgroundRemover() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0, show: false });
  const processedImageRef = useRef<HTMLDivElement | null>(null);

  const handleFilesUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;

      if (typeof result === "string") {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          removeBackgroundAI(result);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const removeBackgroundAI = async (imageUrl: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simula progresso enquanto processa
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const blob = await removeBackground(imageUrl);

      clearInterval(progressInterval);
      setProgress(100);

      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (error) {
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
      const response = await fetch(processedImage);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      toast.success("Imagem copiada!");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      toast.error("Erro ao copiar imagem");
    }
  };

  const reset = () => {
    if (processedImage) {
      URL.revokeObjectURL(processedImage);
    }
    setOriginalImage(null);
    setProcessedImage(null);
    setProgress(0);
  };

  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!processedImageRef.current) return;

    const rect = processedImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setZoomPosition({ x, y, show: true });
  };

  const handleZoomLeave = () => {
    setZoomPosition({ x: 0, y: 0, show: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-lg font-semibold">Removedor de Fundo com IA</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Remova o fundo de imagens. Processadas no seu dispositivo.
          </p>
        </div>

        {!originalImage ? (
          <FileDropzone
            onUpload={handleFilesUpload}
            accept="image/*"
            isLoading={isProcessing}
            className="mx-auto max-w-lg"
          />
        ) : (
          <div className="space-y-6">
            {/* Controles */}
            <Card className="p-4 mx-auto max-w-lg w-fit">
              <div className="space-y-4">
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm gap-8">
                      <span className="text-muted-foreground animate-pulse">
                        Processando com IA...
                      </span>

                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {!isProcessing && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={reset} variant="outline">
                      <Trash2 className="w-4 h-4" />
                      Novo
                    </Button>

                    <Button
                      onClick={copyImage}
                      disabled={!processedImage}
                      variant="outline"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar
                    </Button>

                    <Button onClick={downloadImage} disabled={!processedImage}>
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Badge className="mb-2">Original</Badge>

                <div className="relative bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={originalImage.src}
                    alt="Original"
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <div>
                <Badge className="mb-2">
                  Sem Fundo
                  {isProcessing && (
                    <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />
                  )}
                </Badge>

                <div
                  ref={processedImageRef}
                  onMouseMove={handleZoomMove}
                  onMouseLeave={handleZoomLeave}
                  className="relative bg-slate-100 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center cursor-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                >
                  {isProcessing ? (
                    <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                  ) : (
                    processedImage && (
                      <img
                        src={processedImage}
                        alt="Processado"
                        className="w-full h-auto"
                      />
                    )
                  )}

                  {/* Lupa com zoom */}
                  {zoomPosition.show &&
                    processedImage &&
                    !isProcessing &&
                    processedImageRef.current && (
                      <div>
                        <div
                          className="absolute z-50 pointer-events-none border-4 border-white shadow-2xl rounded-full overflow-hidden"
                          style={{
                            width: "300px",
                            height: "300px",
                            left: `${zoomPosition.x - 75}px`,
                            top: `${zoomPosition.y - 75}px`,
                            backgroundImage: `url(${processedImage})`,
                            backgroundSize: `${
                              processedImageRef.current?.offsetWidth * 3
                            }px ${
                              processedImageRef.current?.offsetHeight * 3
                            }px`,
                            backgroundPosition: `-${
                              zoomPosition.x * 3 - 75
                            }px -${zoomPosition.y * 3 - 75}px`,
                            backgroundRepeat: "no-repeat",
                          }}
                        >
                          <div className="absolute inset-0 border-2 border-blue-500 rounded-full" />
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500" />
                        </div>

                        <div
                          className="absolute pointer-events-none border-4 border-white shadow-2xl rounded-full overflow-hidden"
                          style={{
                            width: "300px",
                            height: "300px",
                            left: `${zoomPosition.x - 75}px`,
                            top: `${zoomPosition.y - 75}px`,
                            backgroundColor: "white",
                            backgroundImage:
                              "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
                            backgroundSize: "20px 20px",
                            backgroundPosition:
                              "0 0, 0 10px, 10px -10px, -10px 0px",
                          }}
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
