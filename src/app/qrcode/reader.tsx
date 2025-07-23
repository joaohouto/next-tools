"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
import { QrCode } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { BrowserQRCodeReader } from "@zxing/browser";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    <div className="flex flex-col gap-4">
      <ImageDropzone
        onUpload={(files) => {
          if (files.length > 0) {
            const imageUrl = URL.createObjectURL(files[0]);
            setImage(imageUrl);
          }
        }}
      />

      <canvas ref={canvasRef} className="hidden" />

      <div className="p-4 text-sm text-center rounded-xl bg-muted w-full">
        {result ? (
          <Markdown remarkPlugins={[remarkGfm]}>{result}</Markdown>
        ) : (
          "Nenhum QRCode lido ainda."
        )}
      </div>

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
    </div>
  );
}
