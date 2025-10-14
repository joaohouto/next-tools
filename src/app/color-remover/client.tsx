"use client";

import React, { useState, useRef } from "react";
import { Download, RefreshCw, Trash2, Pipette, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FileDropzone from "@/components/file-dropzone";

export default function ColorRemover() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(30);
  const [targetColor, setTargetColor] = useState("#ffffff");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0, show: false });
  const processedImageRef = useRef<HTMLDivElement | null>(null);

  const handleFilesUpload = (files: File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
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
          removeBackground(img, threshold, targetColor);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = (
    img: HTMLImageElement,
    thresholdValue: number,
    color: string
  ) => {
    setIsProcessing(true);

    setTimeout(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const targetR = parseInt(color.slice(1, 3), 16);
      const targetG = parseInt(color.slice(3, 5), 16);
      const targetB = parseInt(color.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
        );

        if (diff < thresholdValue) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL("image/png"));
      setIsProcessing(false);
    }, 100);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseInt(e.target.value, 10);
    setThreshold(newThreshold);
    if (originalImage) {
      removeBackground(originalImage, newThreshold, targetColor);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setTargetColor(newColor);
    if (originalImage) {
      removeBackground(originalImage, threshold, newColor);
    }
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
    const x = Math.floor(
      (e.clientX - rect.left) * (originalImage.width / rect.width)
    );
    const y = Math.floor(
      (e.clientY - rect.top) * (originalImage.height / rect.height)
    );

    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;

    const hexColor =
      "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
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
          <h1 className="text-lg font-semibold">Removedor de Cor</h1>
          <p className="text-muted-foreground text-sm">
            Deixe suas imagens transparentes.
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
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Seletor de Cor */}
                  <div className="flex-1">
                    <Label className="mb-2 block">Cor para remover</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={targetColor}
                        onChange={handleColorChange}
                        className="w-10 h-10 rounded-lg cursor-pointer border-2"
                      />
                      <Input
                        type="text"
                        value={targetColor}
                        onChange={handleColorChange}
                        placeholder="#ffffff"
                        className="flex-1 font-mono"
                      />
                      <Button
                        variant={isPickingColor ? "default" : "outline"}
                        onClick={() => setIsPickingColor(!isPickingColor)}
                        className="whitespace-nowrap"
                      >
                        <Pipette className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {isPickingColor ? "Cancelar" : "Conta-gotas"}
                        </span>
                      </Button>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 md:items-end">
                    <Button onClick={reset} variant="outline">
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline ml-2">Nova</span>
                    </Button>

                    <Button
                      onClick={downloadImage}
                      disabled={!processedImage || isProcessing}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Controle de Tolerância */}
                <div>
                  <Label className="mb-2 block">Tolerância: {threshold}</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={handleThresholdChange}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs text-muted-foreground block mt-1">
                    Ajuste para remover tons similares à cor selecionada
                  </span>
                </div>
              </div>
            </Card>

            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Badge className="mb-2">Original</Badge>
                <div
                  className={`relative bg-slate-100 rounded-lg overflow-hidden transition-all ${
                    isPickingColor && "border-4 border-blue-500"
                  }`}
                >
                  <img
                    src={originalImage.src}
                    alt="Original"
                    className={`w-full h-auto ${
                      isPickingColor ? "cursor-crosshair" : ""
                    }`}
                    onClick={handleImageClick}
                  />
                  {isPickingColor && (
                    <div className="absolute inset-0 bg-blue-500/20 pointer-events-none flex items-center justify-center">
                      <div className="bg-blue-600 text-white text-sm px-6 py-2 rounded-full flex gap-2 items-center">
                        <Info className="w-4 h-4" />
                        Clique para selecionar a cor
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Badge className="mb-2">
                  Sem Cor
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
                  {processedImage && (
                    <img
                      src={processedImage}
                      alt="Processado"
                      className="w-full h-auto"
                    />
                  )}
                  {zoomPosition.show &&
                    processedImage &&
                    processedImageRef.current && (
                      <>
                        <div
                          className="absolute z-10 pointer-events-none border-4 border-white shadow-2xl rounded-full overflow-hidden"
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
                        <div
                          className="absolute z-20 pointer-events-none border-4 border-white shadow-2xl rounded-full overflow-hidden"
                          style={{
                            width: "300px",
                            height: "300px",
                            left: `${zoomPosition.x - 75}px`,
                            top: `${zoomPosition.y - 75}px`,
                            backgroundImage: `url(${processedImage})`,
                            backgroundSize: `${
                              processedImageRef.current.offsetWidth * 3
                            }px ${
                              processedImageRef.current.offsetHeight * 3
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
                      </>
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
