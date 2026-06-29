"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScanText, Copy, Check, ImageUp, X } from "lucide-react";
import Tesseract from "tesseract.js";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";

export default function OcrPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!image) return;
    setLoading(true);
    setText("");
    Tesseract.recognize(image, "por")
      .then(({ data: { text } }) => setText(text))
      .catch(() => toast.error("Erro ao processar imagem. Tente novamente."))
      .finally(() => setLoading(false));
  }, [image]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImage(url);
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            handleFiles([file]);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClear = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setImage(null);
    setText("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Upload / preview */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          onClick={() => !loading && inputRef.current?.click()}
          className={`group relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
            over
              ? "border-primary bg-primary/5"
              : image
                ? "border-border hover:border-foreground/40"
                : "border-dashed border-foreground/20 hover:border-foreground/40 bg-muted/30"
          }`}
        >
          {image ? (
            <>
              <img
                src={image}
                alt="Preview"
                className="w-full h-auto max-h-64 object-contain"
              />

              {!loading && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 bg-background/90 text-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow">
                    <ImageUp size={13} /> Trocar imagem (Ctrl+V)
                  </div>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Spinner />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 px-6">
              <div className="size-12 rounded-2xl bg-muted flex items-center justify-center">
                <ScanText size={22} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Reconhecimento de texto</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arraste, clique ou cole (Ctrl+V) uma imagem
                </p>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files && handleFiles(Array.from(e.target.files))
            }
          />
        </div>

        {/* Text output — only after image is loaded */}
        {image && (
          <div className="rounded-2xl border bg-muted/50 p-4 flex flex-col gap-3">
            {text && (
              <div className="flex justify-end">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-green-500" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copiar
                    </>
                  )}
                </button>
              </div>
            )}
            <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed min-h-[120px]">
              {loading ? (
                <span className="text-muted-foreground/60 italic">
                  Reconhecendo texto…
                </span>
              ) : (
                text || (
                  <span className="text-muted-foreground/60 italic">
                    Nenhum texto encontrado.
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
