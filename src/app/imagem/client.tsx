"use client";

import { useState, useRef, useEffect, useCallback, type DragEvent } from "react";
import {
  ArrowLeft, Download, Trash2, Copy, Link, Unlink, Pipette, Check,
  Sparkles, Loader2, RefreshCw, Info, ImageIcon, Images,
  ImageDown, Scaling, Repeat2, BookImage, Eraser, PenTool, Palette as PaletteIcon,
  Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

// ─── types ────────────────────────────────────────────────────────────────────

type ImageMode =
  | "idle" | "choosing"
  | "compress" | "resize" | "convert"
  | "remove-bg" | "remove-color" | "vectorize" | "palette";

type ItemStatus = "idle" | "processing" | "done" | "error";

interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  resultUrl?: string;
  resultSize?: number;
  status: ItemStatus;
}

// ─── constants ────────────────────────────────────────────────────────────────

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0,0 10px,10px -10px,-10px 0px",
  backgroundColor: "white",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── image drop zone ──────────────────────────────────────────────────────────

function ImageDropZone({
  onFiles,
  compact = false,
  multiple = false,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  multiple?: boolean;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 select-none",
        over ? "border-primary bg-primary/5" : "border-foreground/20 hover:border-foreground/40",
        compact ? "py-3 px-4" : "py-16 px-8",
      )}
    >
      <Images size={compact ? 18 : 36} className={cn("text-muted-foreground", over && "text-primary")} />
      <p className="text-sm text-muted-foreground text-center text-balance">
        {compact ? "Adicionar mais imagens" : "Arraste imagens aqui"}
      </p>
      {!compact && (
        <p className="text-xs text-muted-foreground/60">
          Comprimir · Redimensionar · Remover fundo · e mais
        </p>
      )}
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

// ─── action card ──────────────────────────────────────────────────────────────

function ActionCard({ icon, title, desc, onClick }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-start gap-2 p-3 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left w-full">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{desc}</p>
      </div>
    </button>
  );
}

// ─── back button ──────────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
      <ArrowLeft size={13} /> Voltar
    </button>
  );
}

// ─── before / after layout ────────────────────────────────────────────────────

function BeforeAfter({
  original,
  result,
  resultLabel,
  checkerboard = false,
  children,
}: {
  original: HTMLImageElement;
  result?: string | null;
  resultLabel: string;
  checkerboard?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
        <div className="rounded-xl overflow-hidden border bg-muted/30">
          <img src={original.src} alt="Original" className="w-full h-auto" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{resultLabel}</span>
        <div className="rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center"
          style={checkerboard ? CHECKERBOARD : undefined}>
          {result
            ? <img src={result} alt={resultLabel} className="w-full h-auto" />
            : children ?? <ImageIcon size={32} className="text-muted-foreground/20" />}
        </div>
      </div>
    </div>
  );
}

// ─── controls bar ─────────────────────────────────────────────────────────────

function ControlsBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4">{children}</div>
  );
}

// ─── COMPRESS VIEW ────────────────────────────────────────────────────────────

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

function CompressView({ initialFiles, onBack }: { initialFiles: File[]; onBack: () => void }) {
  const [items, setItems] = useState<BatchItem[]>(() =>
    initialFiles.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), status: "idle" as const }))
  );
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [processing, setProcessing] = useState(false);

  useEffect(() => () => items.forEach((i) => { URL.revokeObjectURL(i.previewUrl); if (i.resultUrl) URL.revokeObjectURL(i.resultUrl); }), []); // eslint-disable-line react-hooks/exhaustive-deps

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
            {processing ? <Loader2 size={14} className="animate-spin" /> : null}
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
              {item.status === "processing" && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
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

// ─── RESIZE VIEW ─────────────────────────────────────────────────────────────

function ResizeView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [locked, setLocked] = useState(true);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fileToDataUrl(file).then(loadImage).then((i) => { setImg(i); setWidth(i.naturalWidth); setHeight(i.naturalHeight); });
    return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ratio = img ? img.naturalWidth / img.naturalHeight : 1;

  const setW = (w: number) => { setWidth(w); if (locked) setHeight(Math.round(w / ratio)); };
  const setH = (h: number) => { setHeight(h); if (locked) setWidth(Math.round(h * ratio)); };

  const apply = () => {
    if (!img || !width || !height) return;
    setProcessing(true);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setProcessing(false);
    }, "image/png");
  };

  const download = () => {
    if (!resultUrl) return;
    Object.assign(document.createElement("a"), { href: resultUrl, download: `redimensionada-${width}x${height}.png` }).click();
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões</Label>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-muted-foreground">Largura (px)</Label>
              <Input type="number" min={1} value={width} onChange={(e) => setW(Number(e.target.value))} className="font-mono" />
            </div>
            <button onClick={() => setLocked(!locked)} className="mt-5 p-2 rounded-lg border hover:bg-muted transition-colors">
              {locked ? <Link size={16} /> : <Unlink size={16} className="text-muted-foreground" />}
            </button>
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-muted-foreground">Altura (px)</Label>
              <Input type="number" min={1} value={height} onChange={(e) => setH(Number(e.target.value))} className="font-mono" />
            </div>
          </div>
          {img && <p className="text-xs text-muted-foreground">Original: {img.naturalWidth} × {img.naturalHeight} px</p>}
        </div>
        <div className="flex gap-2">
          <div className="flex-1" />
          <Button size="sm" onClick={apply} disabled={processing}>Aplicar</Button>
          <Button size="sm" variant="outline" onClick={download} disabled={!resultUrl}>
            <Download size={14} /> Baixar
          </Button>
        </div>
      </ControlsBar>
      {img && (
        <BeforeAfter original={img} result={resultUrl} resultLabel={resultUrl ? `Resultado — ${width}×${height}` : "Resultado"}>
          <p className="text-sm text-muted-foreground">Clique em "Aplicar"</p>
        </BeforeAfter>
      )}
    </div>
  );
}

// ─── CONVERT VIEW ────────────────────────────────────────────────────────────

type ConvertFormat = "image/webp" | "image/png" | "image/jpeg";

function convertOne(file: File, targetFormat: ConvertFormat): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new globalThis.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      if (targetFormat === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("failed")); return; }
        resolve({ url: URL.createObjectURL(blob), size: blob.size });
      }, targetFormat, 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}

function ConvertView({ initialFiles, onBack }: { initialFiles: File[]; onBack: () => void }) {
  const [items, setItems] = useState<BatchItem[]>(() =>
    initialFiles.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), status: "idle" as const }))
  );
  const [targetFormat, setTargetFormat] = useState<ConvertFormat>("image/webp");
  const [processing, setProcessing] = useState(false);

  useEffect(() => () => items.forEach((i) => { URL.revokeObjectURL(i.previewUrl); if (i.resultUrl) URL.revokeObjectURL(i.resultUrl); }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (files: File[]) =>
    setItems((prev) => [...prev, ...files.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), status: "idle" as const }))]);

  const remove = (id: string) =>
    setItems((prev) => { const item = prev.find((i) => i.id === id); if (item) { URL.revokeObjectURL(item.previewUrl); if (item.resultUrl) URL.revokeObjectURL(item.resultUrl); } return prev.filter((i) => i.id !== id); });

  const processAll = async () => {
    setProcessing(true);
    for (const item of items) {
      setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: "processing" } : i));
      try {
        const { url, size } = await convertOne(item.file, targetFormat);
        setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: "done", resultUrl: url, resultSize: size } : i));
      } catch {
        setItems((p) => p.map((i) => i.id === item.id ? { ...i, status: "error" } : i));
      }
    }
    setProcessing(false);
    toast.success("Conversão concluída!");
  };

  const ext = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" } as const;

  const downloadOne = (item: BatchItem) => {
    if (!item.resultUrl) return;
    Object.assign(document.createElement("a"), { href: item.resultUrl, download: `${item.file.name.replace(/\.[^.]+$/, "")}.${ext[targetFormat]}` }).click();
  };

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Converter para</Label>
          <div className="flex gap-2">
            {(["image/webp", "image/png", "image/jpeg"] as const).map((f) => (
              <button key={f} onClick={() => setTargetFormat(f)}
                className={cn("px-3 py-1 rounded-lg border text-xs font-medium transition-all", targetFormat === f ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/40")}>
                {f.split("/")[1].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={processAll} disabled={processing || items.length === 0}>
            {processing && <Loader2 size={14} className="animate-spin" />}
            Converter tudo
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={() => items.filter((i) => i.resultUrl).forEach(downloadOne)} disabled={!items.some((i) => i.resultUrl)}>
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
                {item.file.type.split("/")[1].toUpperCase()} → {ext[targetFormat].toUpperCase()}
                {item.resultSize != null && <> · {fmt(item.resultSize)}</>}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.status === "processing" && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
              {item.status === "done" && <Check size={14} className="text-green-500" />}
              {item.status === "error" && <X size={14} className="text-red-500" />}
              {item.resultUrl && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadOne(item)}><Download size={13} /></Button>}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(item.id)}><Trash2 size={13} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── REMOVE BG VIEW ───────────────────────────────────────────────────────────

function RemoveBgView({ file, onBack }: { file: File; onBack: () => void }) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Carregando modelo…");
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0, show: false });
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    doRemoveBg();
    return () => {
      URL.revokeObjectURL(previewUrl);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doRemoveBg = async () => {
    setProcessing(true); setProgress(0); setProgressLabel("Carregando modelo…");
    const seen = new Map<string, [number, number]>();
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        model: "isnet_quint8",
        progress: (key, current, total) => {
          seen.set(key, [current, total]);
          let c = 0, t = 0;
          for (const [cur, tot] of seen.values()) { c += cur; t += tot; }
          if (t > 0) {
            const pct = Math.round((c / t) * 100);
            setProgress(pct);
            setProgressLabel(pct < 100 ? "Baixando modelo…" : "Processando imagem…");
          }
        },
      });
      setProgress(100);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = URL.createObjectURL(blob);
      setResult(resultUrlRef.current);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover fundo.");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const download = () => { if (!result) return; Object.assign(document.createElement("a"), { href: result, download: `${file.name.replace(/\.[^.]+$/, "")}-sem-fundo.png` }).click(); };
  const copy = async () => {
    if (!result) return;
    try { const blob = await fetch(result).then((r) => r.blob()); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); toast.success("Copiado!"); }
    catch { toast.error("Erro ao copiar."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        {processing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                {progress > 0
                  ? <><Sparkles size={16} className="animate-pulse text-blue-500" /> {progressLabel}</>
                  : <><Loader2 size={16} className="animate-spin text-blue-500" /> {progressLabel}</>
                }
              </span>
              {progress > 0 && <span className="font-mono font-medium">{progress}%</span>}
            </div>
            {progress > 0 && <Progress value={progress} className="h-1.5" />}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={doRemoveBg} disabled={processing}><RefreshCw size={14} /> Refazer</Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={copy} disabled={!result}><Copy size={14} /> Copiar</Button>
            <Button size="sm" onClick={download} disabled={!result}><Download size={14} /> Baixar</Button>
          </div>
        )}
      </ControlsBar>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
          <div className="rounded-xl overflow-hidden border bg-muted/30"><img src={previewUrl} alt="" className="w-full h-auto" /></div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sem fundo</span>
          <div ref={containerRef} onMouseMove={(e) => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); setZoom({ x: e.clientX - r.left, y: e.clientY - r.top, show: true }); }} onMouseLeave={() => setZoom({ x: 0, y: 0, show: false })}
            className="relative rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center cursor-none" style={CHECKERBOARD}>
            {processing ? <Sparkles size={40} className="text-blue-500 animate-pulse" />
              : result ? <img src={result} alt="" className="w-full h-auto" />
              : <ImageIcon size={32} className="text-muted-foreground/20" />}
            {zoom.show && result && containerRef.current && (
              <>
                <div className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden" style={{ width: 160, height: 160, left: zoom.x - 80, top: zoom.y - 80, zIndex: 10, ...CHECKERBOARD }} />
                <div className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                  style={{ width: 160, height: 160, left: zoom.x - 80, top: zoom.y - 80, zIndex: 20, backgroundImage: `url(${result})`, backgroundSize: `${containerRef.current.offsetWidth * 3}px ${containerRef.current.offsetHeight * 3}px`, backgroundPosition: `-${zoom.x * 3 - 80}px -${zoom.y * 3 - 80}px`, backgroundRepeat: "no-repeat" }}>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/60" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/60" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/60" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REMOVE COLOR VIEW ────────────────────────────────────────────────────────

function RemoveColorView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [color, setColor] = useState("#ffffff");
  const [threshold, setThreshold] = useState(30);
  const debouncedThreshold = useDebounce(threshold, 400);
  const [processing, setProcessing] = useState(false);
  const [picking, setPicking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0, show: false });

  useEffect(() => {
    fileToDataUrl(file).then(async (src) => { const i = await loadImage(src); setImg(i); removeColor(i, threshold, color); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (img) removeColor(img, debouncedThreshold, color); }, [debouncedThreshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeColor = (image: HTMLImageElement, thr: number, hex: string) => {
    setProcessing(true);
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = data.data;
      const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16);
      for (let i = 0; i < d.length; i += 4) {
        if (Math.sqrt((d[i] - tr) ** 2 + (d[i + 1] - tg) ** 2 + (d[i + 2] - tb) ** 2) < thr) d[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      setResult(canvas.toDataURL("image/png"));
      setProcessing(false);
    }, 50);
  };

  const pickColor = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!picking || !img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (img.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (img.height / rect.height));
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    const hex = "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
    setColor(hex); setPicking(false);
    removeColor(img, threshold, hex);
  };

  const handleColorChange = (hex: string) => { setColor(hex); if (img) removeColor(img, threshold, hex); };

  const download = () => { if (!result) return; Object.assign(document.createElement("a"), { href: result, download: "sem-cor.png" }).click(); };
  const copy = async () => {
    if (!result) return;
    try { const blob = await fetch(result).then((r) => r.blob()); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); toast.success("Copiado!"); }
    catch { toast.error("Erro ao copiar."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cor para remover</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => handleColorChange(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer border" />
              <Input type="text" value={color} onChange={(e) => handleColorChange(e.target.value)} className="flex-1 font-mono h-9" placeholder="#ffffff" />
              <Button variant={picking ? "default" : "outline"} size="sm" onClick={() => setPicking(!picking)}>
                <Pipette size={14} /> <span className="hidden sm:inline">{picking ? "Cancelar" : "Conta-gotas"}</span>
              </Button>
            </div>
          </div>
          <div className="flex gap-2 sm:items-end">
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={copy} disabled={!result || processing}><Copy size={14} /> Copiar</Button>
            <Button size="sm" onClick={download} disabled={!result || processing}><Download size={14} /> Baixar</Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tolerância</Label>
            <span className="font-mono text-sm font-medium">{threshold}</span>
          </div>
          <input type="range" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600" />
        </div>
      </ControlsBar>
      {img && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
            <div className={cn("relative rounded-xl overflow-hidden border bg-muted/30", picking && "ring-2 ring-blue-500")}>
              <img src={img.src} alt="" className={cn("w-full h-auto", picking && "cursor-crosshair")} onClick={pickColor} />
              {picking && (
                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none flex items-center justify-center">
                  <div className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-full flex gap-2 items-center">
                    <Info size={14} /> Clique para selecionar a cor
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Sem cor {processing && <RefreshCw size={12} className="animate-spin" />}
            </span>
            <div ref={containerRef}
              onMouseMove={(e) => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); setZoom({ x: e.clientX - r.left, y: e.clientY - r.top, show: true }); }}
              onMouseLeave={() => setZoom({ x: 0, y: 0, show: false })}
              className="relative rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center cursor-none" style={CHECKERBOARD}>
              {result && <img src={result} alt="" className="w-full h-auto" />}
              {zoom.show && result && containerRef.current && (
                <>
                  <div className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden" style={{ width: 160, height: 160, left: zoom.x - 80, top: zoom.y - 80, zIndex: 10, ...CHECKERBOARD }} />
                  <div className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{ width: 160, height: 160, left: zoom.x - 80, top: zoom.y - 80, zIndex: 20, backgroundImage: `url(${result})`, backgroundSize: `${containerRef.current.offsetWidth * 3}px ${containerRef.current.offsetHeight * 3}px`, backgroundPosition: `-${zoom.x * 3 - 80}px -${zoom.y * 3 - 80}px`, backgroundRepeat: "no-repeat" }}>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500/60" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/60" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/60" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VECTORIZE VIEW ───────────────────────────────────────────────────────────

function VectorizeView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const debouncedThreshold = useDebounce(threshold, 500);
  const dataUrlRef = useRef<string>("");

  useEffect(() => {
    fileToDataUrl(file).then(async (src) => {
      dataUrlRef.current = src;
      const i = await loadImage(src);
      setImg(i);
      doVectorize(src, 128);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (dataUrlRef.current) doVectorize(dataUrlRef.current, debouncedThreshold); }, [debouncedThreshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const doVectorize = async (src: string, thr: number) => {
    setProcessing(true);
    try {
      const { default: Potrace } = await import("potrace");
      const resp = await fetch(src);
      const buffer = Buffer.from(await resp.arrayBuffer());
      Potrace.trace(buffer, { threshold: thr, color: "#000000", background: "transparent", optTolerance: 0.2, turdSize: 2 },
        (err: Error | null, result: string) => {
          if (err) { toast.error("Erro ao vetorizar."); } else { setSvg(result); }
          setProcessing(false);
        });
    } catch (err) {
      console.error(err); toast.error("Erro ao vetorizar."); setProcessing(false);
    }
  };

  const download = () => {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    Object.assign(document.createElement("a"), { href: url, download: "vetorizada.svg" }).click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    if (!svg) return;
    try { await navigator.clipboard.writeText(svg); toast.success("SVG copiado!"); }
    catch { toast.error("Erro ao copiar."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Threshold (Contraste)</Label>
            <Input type="number" min={0} max={255} value={threshold} onChange={(e) => setThreshold(Math.max(0, Math.min(255, Number(e.target.value) || 0)))} disabled={processing} className="w-20 h-7 font-mono text-sm" />
          </div>
          <input type="range" min={0} max={255} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} disabled={processing} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={copy} disabled={!svg || processing}><Copy size={14} /> Copiar SVG</Button>
          <Button size="sm" onClick={download} disabled={!svg || processing}><Download size={14} /> Baixar</Button>
        </div>
      </ControlsBar>
      {img && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
            <div className="rounded-xl overflow-hidden border bg-muted/30"><img src={img.src} alt="" className="w-full h-auto" /></div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Vetorizado (SVG) {processing && <RefreshCw size={12} className="animate-spin" />}
            </span>
            <div className="rounded-xl overflow-hidden border bg-white min-h-[200px] flex items-center justify-center">
              {processing ? <div className="flex flex-col items-center gap-2"><RefreshCw size={32} className="text-blue-500 animate-spin" /><span className="text-sm text-muted-foreground">Vetorizando…</span></div>
                : svg ? <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full [&_svg]:w-full [&_svg]:h-auto" />
                : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PALETTE VIEW ─────────────────────────────────────────────────────────────

function extractPalette(img: HTMLImageElement, count: number): string[] {
  const canvas = document.createElement("canvas");
  const MAX = 200;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const map = new Map<string, number>();
  const STEP = 16;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = Math.round(data[i] / STEP) * STEP, g = Math.round(data[i + 1] / STEP) * STEP, b = Math.round(data[i + 2] / STEP) * STEP;
    const brightness = (r + g + b) / 3;
    if (brightness > 240 || brightness < 15) continue;
    const key = `${r},${g},${b}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([key]) => {
    const [r, g, b] = key.split(",").map(Number);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  });
}

function contrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000000" : "#ffffff";
}

function PaletteView({ file, onBack }: { file: File; onBack: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [count, setCount] = useState(8);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fileToDataUrl(file).then(async (src) => { const i = await loadImage(src); setImg(i); setPalette(extractPalette(i, 8)); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeCount = (n: number) => { setCount(n); if (img) setPalette(extractPalette(img, n)); };

  const copyOne = async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    setCopied(hex); toast.success(`${hex} copiado!`);
    setTimeout(() => setCopied(null), 1500);
  };
  const copyAll = () => { navigator.clipboard.writeText(palette.join(", ")); toast.success("Paleta copiada!"); };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número de cores</Label>
            <span className="font-mono text-sm font-medium">{count}</span>
          </div>
          <input type="range" min={4} max={16} value={count} onChange={(e) => changeCount(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={copyAll} disabled={palette.length === 0}>
            <Copy size={14} /> Copiar paleta
          </Button>
        </div>
      </ControlsBar>
      {img && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imagem</span>
            <div className="rounded-xl overflow-hidden border bg-muted/30"><img src={img.src} alt="" className="w-full h-auto" /></div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paleta — {palette.length} cores</span>
            <div className="rounded-xl overflow-hidden border flex flex-col divide-y">
              {palette.map((hex) => (
                <button key={hex} onClick={() => copyOne(hex)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:opacity-90 transition-opacity group" style={{ backgroundColor: hex }}>
                  <span className="font-mono text-sm font-medium tracking-wide flex-1 text-left" style={{ color: contrastColor(hex) }}>{hex.toUpperCase()}</span>
                  {copied === hex
                    ? <Check size={14} className="opacity-70" style={{ color: contrastColor(hex) }} />
                    : <Copy size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: contrastColor(hex) }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CHOOSING VIEW ────────────────────────────────────────────────────────────

const ACTIONS = [
  { mode: "compress"     as ImageMode, icon: <ImageDown size={20} />, title: "Comprimir",      desc: "Reduza o tamanho dos arquivos" },
  { mode: "resize"       as ImageMode, icon: <Scaling size={20} />,   title: "Redimensionar",  desc: "Altere largura e altura" },
  { mode: "convert"      as ImageMode, icon: <Repeat2 size={20} />,   title: "Converter",      desc: "Mude o formato do arquivo" },
  { mode: "remove-bg"    as ImageMode, icon: <BookImage size={20} />, title: "Remover Fundo",  desc: "IA — processado no dispositivo" },
  { mode: "remove-color" as ImageMode, icon: <Eraser size={20} />,    title: "Remover Cor",    desc: "Remove uma cor específica" },
  { mode: "vectorize"    as ImageMode, icon: <PenTool size={20} />,   title: "Vetorizar",      desc: "Converta para SVG monocromático" },
  { mode: "palette"      as ImageMode, icon: <PaletteIcon size={20} />, title: "Paleta",       desc: "Extraia as cores dominantes" },
];

function ChoosingView({ file, onSelect, onBack }: {
  file: File; onSelect: (mode: ImageMode) => void; onBack: () => void;
}) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onClick={onBack} />
      <div className="p-4 border rounded-xl bg-muted/30 flex items-center gap-3">
        <img src={previewUrl} alt="" className="h-16 w-16 object-cover rounded-lg border shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{fmt(file.size)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">O que deseja fazer?</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ACTIONS.map(({ mode, icon, title, desc }) => (
          <ActionCard key={mode} icon={icon} title={title} desc={desc} onClick={() => onSelect(mode)} />
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ImageTool() {
  const [mode, setMode] = useState<ImageMode>("idle");
  const [files, setFiles] = useState<File[]>([]);

  const reset = () => { setMode("idle"); setFiles([]); };

  const handleDrop = useCallback((dropped: File[]) => {
    const imgs = dropped.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setFiles(imgs);
    setMode(imgs.length === 1 ? "choosing" : "compress");
  }, []);

  const goMode = (m: ImageMode) => setMode(m);

  return (
    <div className={cn("p-8 w-full min-h-screen", mode === "idle" && "flex items-center justify-center")}>
      <div className="w-full md:max-w-[680px] mx-auto">
        {mode === "idle"         && <ImageDropZone onFiles={handleDrop} />}
        {mode === "choosing"     && <ChoosingView file={files[0]} onSelect={goMode} onBack={reset} />}
        {mode === "compress"     && <CompressView initialFiles={files} onBack={reset} />}
        {mode === "resize"       && <ResizeView file={files[0]} onBack={reset} />}
        {mode === "convert"      && <ConvertView initialFiles={files} onBack={reset} />}
        {mode === "remove-bg"    && <RemoveBgView file={files[0]} onBack={reset} />}
        {mode === "remove-color" && <RemoveColorView file={files[0]} onBack={reset} />}
        {mode === "vectorize"    && <VectorizeView file={files[0]} onBack={reset} />}
        {mode === "palette"      && <PaletteView file={files[0]} onBack={reset} />}
      </div>
    </div>
  );
}
