"use client";

import ImageDropzone from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { toast } from "sonner";

function isUrl(text: string) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

export function QRCodeReader() {
  const [image, setImage] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!image) return;
    setResult("");

    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromImageUrl(image)
      .then((r) => setResult(r.getText()))
      .catch(() => setResult("Nenhum QR Code detectado."));
  }, [image]);

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    toast.success("Copiado!");
  };

  return (
    <div className="flex flex-col gap-4">
      <ImageDropzone
        onUpload={(files) => {
          if (files.length > 0) {
            setImage(URL.createObjectURL(files[0]));
          }
        }}
      />

      {image && (
        <div className="flex justify-center">
          <img
            src={image}
            alt="QR Code"
            className="h-32 w-32 rounded-xl border object-contain"
          />
        </div>
      )}

      {result ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-3 break-all font-mono text-sm">{result}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyResult} className="flex-1">
              <Copy className="size-3.5" />
              Copiar
            </Button>
            {isUrl(result) && (
              <Button size="sm" className="flex-1" asChild>
                <a href={result} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Abrir
                </a>
              </Button>
            )}
          </div>
        </div>
      ) : (
        !image && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-muted/20 py-8 text-muted-foreground/40">
            <QrCode size={40} strokeWidth={1} />
            <span className="text-xs">Nenhum QR Code lido ainda</span>
          </div>
        )
      )}
    </div>
  );
}
