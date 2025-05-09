"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
import { QrCode } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";

export function QRCodeReader() {
  const [image, setImage] = useState("");
  const [result, setResult] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        setResult(code.data);
      } else {
        setResult("Nenhum QR Code detectado.");
      }
    };
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

        <div className="p-4 rounded-xl bg-muted text-center w-full">
          {result || "Nenhum QR Code lido ainda."}
        </div>
      </div>
    </div>
  );
}
