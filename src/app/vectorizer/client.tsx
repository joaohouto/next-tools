// @ts-ignore
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Download, RefreshCw, Trash2, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FileDropzone from "@/components/file-dropzone";
import Potrace from "potrace";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

export default function ImageVectorizer() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [vectorizedSVG, setVectorizedSVG] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const debouncedThreshold = useDebounce(threshold, 500);

  const handleFilesUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        vectorizeImage(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const vectorizeImage = async (imageData) => {
    setIsProcessing(true);

    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const params = {
        threshold: threshold,
        color: "#000000",
        background: "transparent",
        optTolerance: 0.2,
        turdSize: 2,
      };

      Potrace.trace(buffer, params, (err, svg) => {
        if (err) {
          console.error("Erro ao vetorizar:", err);
          toast.error("Erro ao processar imagem. Tente outra imagem.");
        } else {
          setVectorizedSVG(svg);
        }
        setIsProcessing(false);
      });
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar imagem. Tente novamente.");
      setIsProcessing(false);
    }
  };

  const handleThresholdChange = (e) => {
    const newThreshold = parseInt(e.target.value);
    setThreshold(newThreshold);
  };

  const handleThresholdInputChange = (e) => {
    const value = e.target.value;
    const newThreshold = Math.max(0, Math.min(255, parseInt(value) || 0));
    setThreshold(newThreshold);
  };

  useEffect(() => {
    if (originalImage) {
      vectorizeImage(originalImage.src);
    }
  }, [debouncedThreshold]);

  const downloadSVG = () => {
    if (!vectorizedSVG) return;

    const blob = new Blob([vectorizedSVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
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

  return (
    <div className="min-h-screen bg-gradient-to-br p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold">Vetorizar Logo</h1>
          <p className="text-muted-foreground text-sm">
            Converta logos em vetores SVG monocromáticos.
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
            <Card className="p-4 mx-auto max-w-lg">
              <div className="flex flex-col gap-4">
                {/* Threshold */}
                <div className="flex-1">
                  <Label className="mb-2 block">Threshold (Contraste)</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={threshold}
                      onChange={handleThresholdChange}
                      disabled={isProcessing}
                      className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={threshold}
                      onChange={handleThresholdInputChange}
                      disabled={isProcessing}
                      className="w-20"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground block mt-1">
                    Ajuste para controlar o nível de detalhes
                  </span>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 md:items-end">
                  <Button onClick={reset} variant="outline">
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova</span>
                  </Button>

                  <Button
                    onClick={copySVG}
                    disabled={!vectorizedSVG || isProcessing}
                    variant="outline"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </Button>

                  <Button
                    onClick={downloadSVG}
                    disabled={!vectorizedSVG || isProcessing}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>

            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Badge className="mb-2">Original</Badge>

                <div className="relative bg-white rounded-lg overflow-hidden">
                  <img
                    src={originalImage.src}
                    alt="Original"
                    className="h-auto mx-auto"
                  />
                </div>
              </div>

              <div>
                <Badge className="mb-2">
                  Vetorizado (SVG)
                  {isProcessing && (
                    <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />
                  )}
                </Badge>

                <div className="relative bg-white rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Vetorizando...
                      </span>
                    </div>
                  ) : (
                    vectorizedSVG && (
                      <div
                        dangerouslySetInnerHTML={{ __html: vectorizedSVG }}
                        className="h-auto mx-auto"
                      />
                    )
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
