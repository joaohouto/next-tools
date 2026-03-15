"use client";

import { useState, useCallback } from "react";
import { Download, Trash2, Plus, Check, X, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FileDropzone from "@/components/file-dropzone";

type Format = "image/png" | "image/jpeg" | "image/webp";
type ItemStatus = "idle" | "processing" | "done" | "error";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  convertedUrl?: string;
  status: ItemStatus;
}

const FORMATS: { mime: Format; label: string; ext: string }[] = [
  { mime: "image/png",  label: "PNG",  ext: "png"  },
  { mime: "image/jpeg", label: "JPEG", ext: "jpg"  },
  { mime: "image/webp", label: "WebP", ext: "webp" },
];

function mimeLabel(mime: string) {
  return FORMATS.find((f) => f.mime === mime)?.label ?? mime.split("/")[1].toUpperCase();
}

function newFilename(originalName: string, targetMime: Format) {
  const fmt = FORMATS.find((f) => f.mime === targetMime)!;
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base}.${fmt.ext}`;
}

function convertImageItem(item: ImageItem, targetFormat: Format): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      if (targetFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Conversion failed")); return; }
        resolve(URL.createObjectURL(blob));
      }, targetFormat);
    };
    img.onerror = () => reject(new Error("Load failed"));
    img.src = item.previewUrl;
  });
}

export default function ImageConverter() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<Format>("image/webp");
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    const newItems: ImageItem[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "idle",
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const convertAll = async () => {
    const pending = items.filter((i) => i.status === "idle" || i.status === "error");
    if (!pending.length) return;
    setIsProcessingAll(true);

    for (const item of pending) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "processing" } : i));
      try {
        const url = await convertImageItem(item, targetFormat);
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "done", convertedUrl: url } : i));
      } catch {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error" } : i));
      }
    }

    setIsProcessingAll(false);
  };

  const downloadItem = (item: ImageItem) => {
    if (!item.convertedUrl) return;
    const link = document.createElement("a");
    link.download = newFilename(item.file.name, targetFormat);
    link.href = item.convertedUrl;
    link.click();
  };

  const downloadAll = () => {
    const done = items.filter((i) => i.status === "done" && i.convertedUrl);
    done.forEach((item, idx) => {
      setTimeout(() => downloadItem(item), idx * 150);
    });
  };

  const handleFormatChange = (fmt: Format) => {
    setTargetFormat(fmt);
    setItems((prev) =>
      prev.map((i) => {
        if (i.convertedUrl) URL.revokeObjectURL(i.convertedUrl);
        return { ...i, status: "idle", convertedUrl: undefined };
      })
    );
  };

  const reset = () => {
    items.forEach((i) => {
      URL.revokeObjectURL(i.previewUrl);
      if (i.convertedUrl) URL.revokeObjectURL(i.convertedUrl);
    });
    setItems([]);
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const pendingCount = items.filter((i) => i.status === "idle" || i.status === "error").length;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Converta várias imagens entre PNG, JPEG e WebP de uma vez.
          </p>
          <FileDropzone onUpload={addFiles} accept="image/*" multiple />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Controls */}
        <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Converter para
            </Label>
            <div className="flex gap-1.5">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt.mime}
                  onClick={() => handleFormatChange(fmt.mime)}
                  disabled={isProcessingAll}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    targetFormat === fmt.mime
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={reset} disabled={isProcessingAll}>
              <Trash2 className="size-3.5" /> Limpar tudo
            </Button>
            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors hover:border-foreground/40 ${isProcessingAll ? "opacity-50 pointer-events-none" : ""}`}>
              <Plus className="size-3.5" />
              Adicionar mais
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} />
            </label>
            <div className="flex-1" />
            {doneCount > 0 && (
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Download className="size-3.5" /> Baixar todos ({doneCount})
              </Button>
            )}
            <Button size="sm" onClick={convertAll} disabled={isProcessingAll || pendingCount === 0}>
              {isProcessingAll && <Loader2 className="size-3.5 animate-spin" />}
              Converter {pendingCount > 0 ? `(${pendingCount})` : ""}
            </Button>
          </div>
        </div>

        {/* File list */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {items.length} imagem{items.length !== 1 ? "s" : ""}
            {doneCount > 0 && ` — ${doneCount} convertida${doneCount !== 1 ? "s" : ""}`}
          </span>

          <div className="rounded-2xl border overflow-hidden divide-y">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-background hover:bg-muted/30 transition-colors">
                {/* Thumbnail */}
                <div className="size-10 rounded-lg overflow-hidden border bg-muted/40 shrink-0">
                  <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{mimeLabel(item.file.type)}</span>
                    <ArrowRight className="size-3 text-muted-foreground/50" />
                    <span className="text-[11px] text-muted-foreground">{mimeLabel(targetFormat)}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {item.status === "idle" && (
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">Aguardando</span>
                  )}
                  {item.status === "processing" && (
                    <Loader2 className="size-4 text-blue-500 animate-spin" />
                  )}
                  {item.status === "done" && (
                    <Check className="size-4 text-emerald-500" />
                  )}
                  {item.status === "error" && (
                    <X className="size-4 text-rose-500" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  {item.status === "done" && (
                    <button
                      onClick={() => downloadItem(item)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title="Baixar"
                    >
                      <Download className="size-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={item.status === "processing"}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
                    title="Remover"
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
