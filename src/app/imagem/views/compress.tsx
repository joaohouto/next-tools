"use client";

import { useState, useEffect } from "react";
import { Download, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/spinner";
import { type BatchItem } from "../types";
import { fmt } from "../helpers";
import { BackBtn, ControlsBar, ImageDropZone } from "../shared";

type OutputFormat = "original" | "image/jpeg" | "image/webp" | "image/png";

function compressOne(file: File, quality: number, format: OutputFormat): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new globalThis.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      const mime = format === "original" ? (file.type || "image/jpeg") : format;
      if (mime === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      const q = mime === "image/png" ? undefined : quality / 100;
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error("failed")); return; }
        resolve({ url: URL.createObjectURL(blob), size: blob.size });
      }, mime, q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}

export function CompressView({ initialFiles, onBack }: { initialFiles: File[]; onBack: () => void }) {
  const [items, setItems] = useState<BatchItem[]>(() =>
    initialFiles.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), status: "idle" as const }))
  );
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [processing, setProcessing] = useState(false);

  useEffect(() => () => items.forEach((i) => { if (i.resultUrl) URL.revokeObjectURL(i.resultUrl); }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (files: File[]) =>
    setItems((prev) => [...prev, ...files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`, file,
      previewUrl: URL.createObjectURL(file), status: "idle" as const,
    }))]);

  const remove = (id: string) =>
    setItems((prev) => { const item = prev.find((i) => i.id === id); if (item) { URL.revokeObjectURL(item.previewUrl); if (item.resultUrl) URL.revokeObjectURL(item.resultUrl); } return prev.filter((i) => i.id !== id); });

  const processAll = async () => {
    setProcessing(true);
    for (const item of items) {
      setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: "processing" } : i));
      try {
        const { url, size } = await compressOne(item.file, quality, format);
        setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: "done", resultUrl: url, resultSize: size } : i));
      } catch {
        setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: "error" } : i));
      }
    }
    setProcessing(false);
    toast.success("Compressão concluída!");
  };

  const downloadOne = (item: BatchItem) => {
    if (!item.resultUrl) return;
    const ext = format === "image/webp" ? "webp" : format === "image/png" ? "png" : format === "image/jpeg" ? "jpg" : item.file.name.split(".").pop() ?? "jpg";
    Object.assign(document.createElement("a"), { href: item.resultUrl, download: `${item.file.name.replace(/\.[^.]+$/, "")}.${ext}` }).click();
  };

  const downloadAll = () => items.filter((i) => i.resultUrl).forEach(downloadOne);

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualidade</Label>
            <span className="font-mono text-sm font-medium">{quality}%</span>
          </div>
          <Slider min={10} max={100} step={1} value={[quality]} onValueChange={(v) => setQuality(v[0])} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formato</Label>
          <div className="flex gap-2 flex-wrap">
            {(["image/jpeg", "image/webp", "image/png", "original"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)}
                className={cn("px-3 py-1 rounded-lg border text-xs font-medium transition-all", format === f ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/40")}>
                {f === "original" ? "Original" : f.split("/")[1].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={processAll} disabled={processing || items.length === 0}>
            {processing && <Spinner className="size-3.5" />}
            Comprimir tudo
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={downloadAll} disabled={!items.some((i) => i.resultUrl)}>
            <Download size={14} /> Baixar tudo
          </Button>
        </div>
      </ControlsBar>

      <ImageDropZone onFiles={addFiles} compact multiple />

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30">
            <img src={item.previewUrl} alt="" className="h-12 w-12 object-cover rounded border shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(item.file.size)}
                {item.resultSize != null && (
                  <> → <span className={item.resultSize < item.file.size ? "text-green-500" : "text-red-500"}>{fmt(item.resultSize)}</span></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.status === "processing" && <Spinner className="size-3.5" />}
              {item.status === "done" && <Check size={14} className="text-green-500" />}
              {item.status === "error" && <X size={14} className="text-red-500" />}
              {item.resultUrl && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadOne(item)}>
                  <Download size={13} />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(item.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
