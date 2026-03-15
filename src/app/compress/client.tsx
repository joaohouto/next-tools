"use client";

import { useState, useCallback } from "react";
import { Download, Trash2, Plus, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FileDropzone from "@/components/file-dropzone";

type OutputFormat = "original" | "image/jpeg" | "image/webp" | "image/png";
type ItemStatus = "idle" | "processing" | "done" | "error";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  convertedUrl?: string;
  convertedSize?: number;
  status: ItemStatus;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "original",    label: "Original" },
  { value: "image/jpeg",  label: "JPEG" },
  { value: "image/webp",  label: "WebP" },
  { value: "image/png",   label: "PNG" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function outputExt(file: File, format: OutputFormat) {
  if (format === "image/png")  return "png";
  if (format === "image/webp") return "webp";
  if (format === "image/jpeg") return "jpg";
  // original
  return file.name.split(".").pop() ?? "jpg";
}

function outputMime(file: File, format: OutputFormat): string {
  if (format !== "original") return format;
  return file.type || "image/jpeg";
}

function compressItem(item: ImageItem, quality: number, format: OutputFormat): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      const mime = outputMime(item.file, format);
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const q = mime === "image/png" ? undefined : quality / 100;
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("failed")); return; }
        resolve({ url: URL.createObjectURL(blob), size: blob.size });
      }, mime, q);
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = item.previewUrl;
  });
}

export default function ImageCompressor() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
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

  const resetResults = () => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.convertedUrl) URL.revokeObjectURL(i.convertedUrl);
        return { ...i, status: "idle", convertedUrl: undefined, convertedSize: undefined };
      })
    );
  };

  const compressAll = async () => {
    const pending = items.filter((i) => i.status === "idle" || i.status === "error");
    if (!pending.length) return;
    setIsProcessingAll(true);

    for (const item of pending) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "processing" } : i));
      try {
        const { url, size } = await compressItem(item, quality, format);
        setItems((prev) => prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", convertedUrl: url, convertedSize: size } : i
        ));
      } catch {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error" } : i));
      }
    }

    setIsProcessingAll(false);
  };

  const downloadItem = (item: ImageItem) => {
    if (!item.convertedUrl) return;
    const ext = outputExt(item.file, format);
    const base = item.file.name.replace(/\.[^.]+$/, "");
    const link = document.createElement("a");
    link.download = `${base}-comprimida.${ext}`;
    link.href = item.convertedUrl;
    link.click();
  };

  const downloadAll = () => {
    items
      .filter((i) => i.status === "done" && i.convertedUrl)
      .forEach((item, idx) => setTimeout(() => downloadItem(item), idx * 150));
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
  const showQuality = format !== "image/png";

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Processado no seu dispositivo, sem enviar para servidores.
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

          {/* Format */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formato de saída</Label>
            <div className="flex gap-1.5 flex-wrap">
              {FORMAT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setFormat(value); resetResults(); }}
                  disabled={isProcessingAll}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    format === value
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {showQuality && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualidade</Label>
                <span className="font-mono text-sm font-medium">{quality}%</span>
              </div>
              <input
                type="range" min="1" max="100" value={quality}
                onChange={(e) => { setQuality(Number(e.target.value)); resetResults(); }}
                disabled={isProcessingAll}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}

          {/* Actions */}
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
            <Button size="sm" onClick={compressAll} disabled={isProcessingAll || pendingCount === 0}>
              {isProcessingAll && <Loader2 className="size-3.5 animate-spin" />}
              Comprimir {pendingCount > 0 ? `(${pendingCount})` : ""}
            </Button>
          </div>
        </div>

        {/* File list */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {items.length} imagem{items.length !== 1 ? "s" : ""}
            {doneCount > 0 && ` — ${doneCount} comprimida${doneCount !== 1 ? "s" : ""}`}
          </span>

          <div className="rounded-2xl border overflow-hidden divide-y">
            {items.map((item) => {
              const savings = item.convertedSize != null
                ? Math.round((1 - item.convertedSize / item.file.size) * 100)
                : null;

              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-background hover:bg-muted/30 transition-colors">
                  {/* Thumbnail */}
                  <div className="size-10 rounded-lg overflow-hidden border bg-muted/40 shrink-0">
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{formatBytes(item.file.size)}</span>
                      {item.convertedSize != null && (
                        <>
                          <span className="text-[11px] text-muted-foreground">→</span>
                          <span className="text-[11px] text-muted-foreground">{formatBytes(item.convertedSize)}</span>
                          {savings !== null && savings > 0 && (
                            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full">
                              -{savings}%
                            </span>
                          )}
                        </>
                      )}
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
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
