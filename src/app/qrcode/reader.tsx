"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
import { QrCode } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

export function QRCodeReader() {
  const [image, setImage] = useState("");
  const [result, setResult] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image) return;

    const reader = new BrowserQRCodeReader();

    reader
      .decodeFromImageUrl(image)
      .then((result) => {
        setResult(result.getText());
      })
      .catch(() => {
        setResult("Nenhum QR Code detectado.");
      });
  }, [image]);

  return (
    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
      <div className="flex flex-col justify-center items-center">
        {image ? (
          <div className="w-[200px] h-[200px]">
            <img src={image} alt="Preview" />
          </div>
        ) : (
          <CardAnimatedBorder className="w-[200px] h-[200px] text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center">
            <QrCode size={148} />
          </CardAnimatedBorder>
        )}
      </div>

      <div className="flex flex-col justify-center items-center gap-4">
        <ImageDropzone
          onUpload={(file) => {
            const imageUrl = URL.createObjectURL(file);
            setImage(imageUrl);
          }}
        />

        <canvas ref={canvasRef} className="hidden" />

        <div className="p-4 rounded-xl bg-muted w-full">
          {result || "Nenhum QR Code lido ainda."}
        </div>
      </div>
    </div>
  );
}
