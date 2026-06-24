"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
} from "react";
import { PDFDocument, degrees, type PDFImage } from "pdf-lib";
import {
  FileText,
  Scissors,
  FileImage,
  FileStack,
  GripVertical,
  Trash2,
  Download,
  ArrowLeft,
  Loader2,
  Check,
  RotateCcw,
  RotateCw,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

type Mode = "idle" | "choosing" | "merge" | "split" | "to-image" | "rotate" | "compress";

interface MergeItem {
  id: string;
  file: File;
  kind: "pdf" | "image";
  pageCount?: number;
  /** object URL for images; rendered JPEG dataUrl for PDFs; null = loading */
  thumbnail: string | null;
}

interface RenderedPage {
  number: number;
  dataUrl: string;
  width: number;
  height: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED =
  "application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp";

function isPdf(f: File) {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}
function isImage(f: File) {
  return f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name);
}
function fmt(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

/** Render one page of a PDF file to a JPEG dataUrl. */
async function renderPage(file: File, pageNum: number, scale: number): Promise<string> {
  const pdfjs = await getPdfjs();
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function toPng(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new globalThis.Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob(
        (blob) => (blob ? blob.arrayBuffer().then(resolve).catch(reject) : reject(new Error("blob"))),
        "image/png",
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}

async function addImagePage(doc: PDFDocument, file: File) {
  let emb: PDFImage;
  if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) {
    emb = await doc.embedJpg(await file.arrayBuffer());
  } else {
    emb = await doc.embedPng(await toPng(file));
  }
  const page = doc.addPage([emb.width, emb.height]);
  page.drawImage(emb, { x: 0, y: 0, width: emb.width, height: emb.height });
}

// ─── drop zone ────────────────────────────────────────────────────────────────

function DropZone({
  onFiles,
  compact = false,
  label,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  label?: string;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => isPdf(f) || isImage(f));
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
        compact ? "py-4 px-6" : "py-16 px-8",
      )}
    >
      <FileText size={compact ? 20 : 36} className={cn("text-muted-foreground", over && "text-primary")} />
      <p className="text-sm text-muted-foreground text-center text-balance">
        {label ?? "Arraste PDFs ou imagens aqui"}
      </p>
      {!compact && (
        <p className="text-xs text-muted-foreground/60">Mesclar · Dividir · Rotar · Comprimir · Converter</p>
      )}
      <input ref={ref} type="file" accept={ACCEPTED} multiple className="hidden"
        onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

// ─── action card ──────────────────────────────────────────────────────────────

function ActionCard({ icon, title, description, onClick }: {
  icon: React.ReactNode; title: string; description: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-start gap-2 p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left w-full">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

// ─── page thumbnail skeleton ───────────────────────────────────────────────────

function ThumbSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-muted animate-pulse rounded", className)} />
  );
}

// ─── merge view ───────────────────────────────────────────────────────────────

function MergeView({ initial, onBack }: { initial: MergeItem[]; onBack: () => void }) {
  const [items, setItems] = useState<MergeItem[]>(initial);
  const [merging, setMerging] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const objUrls = useRef<string[]>([]);

  useEffect(() => () => objUrls.current.forEach(URL.revokeObjectURL), []);

  // Render thumbnails for PDF items that don't have one yet
  useEffect(() => {
    items.forEach((item) => {
      if (item.kind === "pdf" && item.thumbnail === null) {
        renderPage(item.file, 1, 0.35)
          .then((dataUrl) =>
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, thumbnail: dataUrl } : i)),
            ),
          )
          .catch(() =>
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, thumbnail: "" } : i)),
            ),
          );
      }
    });
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback(async (files: File[]) => {
    const newItems: MergeItem[] = await Promise.all(
      files.map(async (file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        if (isPdf(file)) {
          let pageCount: number | undefined;
          try {
            const doc = await PDFDocument.load(await file.arrayBuffer());
            pageCount = doc.getPageCount();
          } catch { /* handled below */ }
          return { id, file, kind: "pdf" as const, pageCount, thumbnail: null };
        } else {
          const url = URL.createObjectURL(file);
          objUrls.current.push(url);
          return { id, file, kind: "image" as const, pageCount: 1, thumbnail: url };
        }
      }),
    );
    setItems((p) => [...p, ...newItems]);
  }, []);

  const remove = (id: string) =>
    setItems((p) => {
      const item = p.find((i) => i.id === id);
      if (item?.kind === "image" && item.thumbnail) {
        URL.revokeObjectURL(item.thumbnail);
        objUrls.current = objUrls.current.filter((u) => u !== item.thumbnail);
      }
      return p.filter((i) => i.id !== id);
    });

  // DnD handlers
  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const onDragOver = (e: DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setOverIdx(null); return; }
    setItems((p) => {
      const next = [...p];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  };

  const merge = async () => {
    if (items.length < 2) { toast.error("Adicione pelo menos 2 arquivos."); return; }
    setMerging(true);
    try {
      const doc = await PDFDocument.create();
      for (const item of items) {
        if (item.kind === "pdf") {
          const src = await PDFDocument.load(await item.file.arrayBuffer());
          const copied = await doc.copyPages(src, src.getPageIndices());
          copied.forEach((p) => doc.addPage(p));
        } else {
          await addImagePage(doc, item.file);
        }
      }
      const url = URL.createObjectURL(new Blob([await doc.save()], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), { href: url, download: "merged.pdf" }).click();
      URL.revokeObjectURL(url);
      toast.success("PDFs mesclados!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao mesclar.");
    } finally {
      setMerging(false);
    }
  };

  const totalPages = items.reduce((s, i) => s + (i.pageCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={13} /> Voltar
      </button>

      <DropZone onFiles={addFiles} compact label="Adicionar mais arquivos" />

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {items.length} arquivo{items.length !== 1 ? "s" : ""} · {totalPages} página{totalPages !== 1 ? "s" : ""} · arraste para reordenar
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOver(e as unknown as DragEvent, i)}
            onDrop={(e) => onDrop(e as unknown as DragEvent, i)}
            className={cn(
              "flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30 transition-all select-none",
              dragIdx === i && "opacity-40",
              overIdx === i && dragIdx !== i && "ring-2 ring-primary ring-offset-1",
            )}
          >
            <GripVertical size={16} className="text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
            <span className="text-xs text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>

            {/* Thumbnail */}
            <div className="h-14 w-10 shrink-0 rounded overflow-hidden border bg-muted flex items-center justify-center">
              {item.thumbnail === null ? (
                <ThumbSkeleton className="w-full h-full" />
              ) : item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <FileText size={16} className="text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(item.file.size)}
                {item.pageCount != null && ` · ${item.pageCount} pág${item.pageCount !== 1 ? "s" : ""}`}
              </p>
            </div>

            <Button variant="ghost" size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={() => remove(item.id)}>
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={merge} disabled={merging || items.length < 2}>
        <Download size={15} />
        {merging ? "Mesclando…" : "Baixar PDF mesclado"}
      </Button>
    </div>
  );
}

// ─── split view ───────────────────────────────────────────────────────────────

function SplitView({ file, pageCount, onBack }: { file: File; pageCount: number; onBack: () => void }) {
  const [thumbs, setThumbs] = useState<Map<number, string>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [splitting, setSplitting] = useState(false);

  // Render all page thumbnails progressively
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
        for (let n = 1; n <= pageCount; n++) {
          if (controller.signal.aborted) break;
          const page = await doc.getPage(n);
          const vp = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setThumbs((prev) => new Map(prev).set(n, dataUrl));
        }
      } catch { /* silent */ }
    })();
    return () => controller.abort();
  }, [file, pageCount]);

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const selectAll = () => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
  const clearAll = () => setSelected(new Set());

  const selectedSorted = [...selected].sort((a, b) => a - b);

  const split = async () => {
    if (selectedSorted.length === 0) { toast.error("Selecione ao menos uma página."); return; }
    setSplitting(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, selectedSorted.map((n) => n - 1));
      copied.forEach((p) => out.addPage(p));
      const url = URL.createObjectURL(new Blob([await out.save()], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), {
        href: url,
        download: file.name.replace(/\.pdf$/i, "") + "-split.pdf",
      }).click();
      URL.revokeObjectURL(url);
      toast.success(`${selectedSorted.length} página${selectedSorted.length !== 1 ? "s" : ""} exportada${selectedSorted.length !== 1 ? "s" : ""}!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao dividir.");
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="p-3 border rounded-lg bg-muted/30 text-sm flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{pageCount} página{pageCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
            Todas
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll} disabled={selected.size === 0}>
            Limpar
          </Button>
        </div>
      </div>

      {/* Page grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => {
          const isSelected = selected.has(n);
          const thumb = thumbs.get(n);
          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-lg border-2 overflow-hidden transition-all focus:outline-none",
                isSelected
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent hover:border-foreground/30",
              )}
            >
              {/* Thumbnail area — fixed aspect ratio to avoid layout shift */}
              <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                {thumb ? (
                  <img src={thumb} alt={`Página ${n}`} className="w-full h-full object-cover" />
                ) : (
                  <ThumbSkeleton className="w-full h-full" />
                )}
              </div>

              {/* Page number */}
              <span className="text-[10px] text-muted-foreground pb-1">{n}</span>

              {/* Selection overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-primary/15 flex items-start justify-end p-1">
                  <div className="bg-primary rounded-full p-0.5">
                    <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Button onClick={split} disabled={splitting || selected.size === 0}>
        <Download size={15} />
        {splitting
          ? "Dividindo…"
          : selected.size === 0
          ? "Selecione páginas"
          : `Baixar ${selected.size} página${selected.size !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}

// ─── to-image view ────────────────────────────────────────────────────────────

function dataUrlToSvg(page: RenderedPage): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">\n  <image xlink:href="${page.dataUrl}" x="0" y="0" width="${page.width}" height="${page.height}"/>\n</svg>`;
}

function ToImageView({ file, onBack }: { file: File; onBack: () => void }) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<"png" | "svg">("png");
  const fileRef = useRef(file);

  const render = useCallback(async (f: File, s: number) => {
    setRendering(true);
    setPages([]);
    try {
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: s });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        setPages((prev) => [...prev, { number: i, dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height }]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao converter o PDF.");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => { render(fileRef.current, scale); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeScale = (v: number[]) => { setScale(v[0]); render(fileRef.current, v[0]); };

  const download = (page: RenderedPage) => {
    const name = file.name.replace(/\.pdf$/i, "");
    if (format === "svg") {
      const svgContent = dataUrlToSvg(page);
      const url = URL.createObjectURL(new Blob([svgContent], { type: "image/svg+xml" }));
      Object.assign(document.createElement("a"), { href: url, download: `${name}-p${page.number}.svg` }).click();
      URL.revokeObjectURL(url);
    } else {
      Object.assign(document.createElement("a"), { href: page.dataUrl, download: `${name}-p${page.number}.png` }).click();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Qualidade · {scale}×</Label>
        <Slider min={1} max={4} step={0.5} value={[scale]}
          onValueChange={changeScale} disabled={rendering} />
        <p className="text-xs text-muted-foreground">1× = 72 dpi · 2× = 144 dpi · 4× = 288 dpi</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Formato de exportação</Label>
        <div className="flex gap-2">
          {(["png", "svg"] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg border text-sm font-medium transition-all",
                format === f ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/40",
              )}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        {format === "svg" && (
          <p className="text-xs text-muted-foreground">SVG com imagem rasterizada embutida (compatível com editores vetoriais)</p>
        )}
      </div>

      {rendering && pages.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" /> Convertendo…
        </div>
      )}

      {pages.length > 0 && (
        <>
          <Button onClick={() => pages.forEach(download)} disabled={rendering}>
            <Download size={15} />
            {rendering
              ? `Convertendo… (${pages.length})`
              : `Baixar todas (${pages.length} ${format.toUpperCase()})`}
          </Button>
          <div className="flex flex-col gap-3">
            {pages.map((page) => (
              <div key={page.number} className="border rounded-xl overflow-hidden">
                <img src={page.dataUrl} alt={`Página ${page.number}`} className="w-full h-auto" />
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <span className="text-xs text-muted-foreground">Página {page.number}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => download(page)}>
                    <Download size={12} /> {format.toUpperCase()}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── rotate view ──────────────────────────────────────────────────────────────

interface PageRot {
  number: number;
  thumb: string | null;
  existingDeg: number;
  delta: number;
}

function RotateView({ file, pageCount, onBack }: { file: File; pageCount: number; onBack: () => void }) {
  const [pages, setPages] = useState<PageRot[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const existingRots = doc.getPages().map((p) => p.getRotation().angle);

        setPages(
          Array.from({ length: pageCount }, (_, i) => ({
            number: i + 1,
            thumb: null,
            existingDeg: existingRots[i] ?? 0,
            delta: 0,
          })),
        );

        const pdfjs = await getPdfjs();
        const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
        for (let n = 1; n <= pageCount; n++) {
          if (controller.signal.aborted) break;
          const page = await pdfjsDoc.getPage(n);
          const vp = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setPages((prev) => prev.map((p) => (p.number === n ? { ...p, thumb: dataUrl } : p)));
        }
      } catch { /* silent */ }
    })();
    return () => controller.abort();
  }, [file, pageCount]);

  const applyDelta = (nums: number[], deg: number) =>
    setPages((prev) =>
      prev.map((p) =>
        nums.includes(p.number)
          ? { ...p, delta: ((p.delta + deg) % 360 + 360) % 360 }
          : p,
      ),
    );

  const resetPages = (nums: number[]) =>
    setPages((prev) => prev.map((p) => (nums.includes(p.number) ? { ...p, delta: 0 } : p)));

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const allNums = pages.map((p) => p.number);
  const hasChanges = pages.some((p) => p.delta !== 0);

  const save = async () => {
    setSaving(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const pdfPages = src.getPages();
      for (const p of pages) {
        const newDeg = ((p.existingDeg + p.delta) % 360 + 360) % 360;
        pdfPages[p.number - 1].setRotation(degrees(newDeg));
      }
      const url = URL.createObjectURL(new Blob([await src.save()], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), {
        href: url,
        download: file.name.replace(/\.pdf$/i, "") + "-rotated.pdf",
      }).click();
      URL.revokeObjectURL(url);
      toast.success("PDF salvo com rotações aplicadas!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aplicar rotações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={13} /> Voltar
      </button>

      {/* File info + global rotate buttons */}
      <div className="p-3 border rounded-lg bg-muted/30 text-sm flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pageCount} página{pageCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta(allNums, -90)}>
            <RotateCcw size={12} /> Todas 90° E
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta(allNums, 90)}>
            <RotateCw size={12} /> Todas 90° D
          </Button>
        </div>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 border rounded-lg bg-primary/5">
          <span className="text-xs text-muted-foreground flex-1">
            {selected.size} página{selected.size !== 1 ? "s" : ""} selecionada{selected.size !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta([...selected], -90)}>
            <RotateCcw size={12} /> 90° E
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => applyDelta([...selected], 90)}>
            <RotateCw size={12} /> 90° D
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyDelta([...selected], 180)}>
            180°
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resetPages([...selected])}>
            Redefinir
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Clique nas páginas para selecionar múltiplas · use os botões abaixo de cada miniatura para rotação individual
      </p>

      {/* Page grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {pages.map((p) => {
          const isSelected = selected.has(p.number);
          const rotated = p.delta % 180 !== 0;
          return (
            <div key={p.number} className="flex flex-col items-center gap-1">
              <button
                onClick={() => toggle(p.number)}
                className={cn(
                  "relative w-full rounded-lg border-2 overflow-hidden transition-all focus:outline-none",
                  isSelected
                    ? "border-primary ring-1 ring-primary"
                    : "border-transparent hover:border-foreground/30",
                )}
              >
                <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {p.thumb ? (
                    <img
                      src={p.thumb}
                      alt={`Página ${p.number}`}
                      className="object-contain transition-transform duration-200"
                      style={{
                        transform: `rotate(${p.delta}deg)`,
                        maxWidth: rotated ? "70%" : "100%",
                        maxHeight: rotated ? "70%" : "100%",
                        width: rotated ? undefined : "100%",
                        height: rotated ? undefined : "100%",
                      }}
                    />
                  ) : (
                    <ThumbSkeleton className="w-full h-full" />
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <div className="bg-primary rounded-full p-0.5">
                      <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                    </div>
                  </div>
                )}

                {p.delta !== 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[9px] text-center py-0.5 font-medium">
                    +{p.delta}°
                  </div>
                )}
              </button>

              <span className="text-[10px] text-muted-foreground">{p.number}</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => applyDelta([p.number], -90)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Girar 90° para a esquerda"
                >
                  <RotateCcw size={12} className="text-muted-foreground" />
                </button>
                {p.delta !== 0 && (
                  <button
                    onClick={() => resetPages([p.number])}
                    className="px-1 rounded hover:bg-muted transition-colors text-[9px] text-muted-foreground font-medium"
                    title="Redefinir rotação"
                  >
                    ↺
                  </button>
                )}
                <button
                  onClick={() => applyDelta([p.number], 90)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Girar 90° para a direita"
                >
                  <RotateCw size={12} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving || !hasChanges}>
        <Download size={15} />
        {saving ? "Salvando…" : "Baixar PDF rotacionado"}
      </Button>
    </div>
  );
}

// ─── compress view ────────────────────────────────────────────────────────────

const COMPRESS_PRESETS = {
  low:    { scale: 1.0, jpeg: 0.45, label: "Baixa",  desc: "Menor arquivo, qualidade reduzida" },
  medium: { scale: 1.5, jpeg: 0.70, label: "Média",  desc: "Equilíbrio entre tamanho e qualidade" },
  high:   { scale: 2.0, jpeg: 0.88, label: "Alta",   desc: "Boa qualidade, redução moderada" },
} as const;

type CompressQuality = keyof typeof COMPRESS_PRESETS;

function CompressView({ file, pageCount, onBack }: { file: File; pageCount: number; onBack: () => void }) {
  const [quality, setQuality] = useState<CompressQuality>("medium");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ bytes: Uint8Array; size: number } | null>(null);

  const compress = async () => {
    setCompressing(true);
    setProgress(0);
    setResult(null);
    try {
      const preset = COMPRESS_PRESETS[quality as CompressQuality];
      const pdfjs = await getPdfjs();
      const bytes = await file.arrayBuffer();
      const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
      const out = await PDFDocument.create();

      for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const vp = page.getViewport({ scale: preset.scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;

        const jpegBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? blob.arrayBuffer().then(resolve) : reject(new Error("blob"))),
            "image/jpeg",
            preset.jpeg,
          );
        });

        const img = await out.embedJpg(jpegBytes);
        const pdfPage = out.addPage([img.width, img.height]);
        pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        setProgress(i);
      }

      const outBytes = await out.save();
      setResult({ bytes: outBytes, size: outBytes.byteLength });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao comprimir o PDF.");
    } finally {
      setCompressing(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.bytes], { type: "application/pdf" }));
    Object.assign(document.createElement("a"), {
      href: url,
      download: file.name.replace(/\.pdf$/i, "") + "-compressed.pdf",
    }).click();
    URL.revokeObjectURL(url);
    toast.success("PDF comprimido baixado!");
  };

  const reduction = result ? Math.round((1 - result.size / file.size) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmt(file.size)} · {pageCount} página{pageCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Qualidade de compressão</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(COMPRESS_PRESETS) as [CompressQuality, typeof COMPRESS_PRESETS[CompressQuality]][]).map(
            ([key, preset]) => (
              <button
                key={key}
                onClick={() => { setQuality(key); setResult(null); }}
                disabled={compressing}
                className={cn(
                  "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                  quality === key
                    ? "border-primary bg-primary/5"
                    : "hover:border-foreground/40 disabled:opacity-50",
                )}
              >
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{preset.desc}</span>
              </button>
            ),
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          A compressão rasteriza o PDF — ideal para documentos escaneados e PDFs com muitas imagens.
        </p>
      </div>

      {compressing && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${pageCount > 0 ? (progress / pageCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Comprimindo página {progress} de {pageCount}…
          </p>
        </div>
      )}

      {result && (
        <div
          className={cn(
            "p-3 border rounded-lg text-sm flex items-center justify-between",
            reduction !== null && reduction > 0
              ? "bg-green-500/10 border-green-500/30 dark:border-green-500/20"
              : "bg-muted/30",
          )}
        >
          <div>
            <p className="font-medium">{fmt(result.size)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {reduction !== null && reduction > 0
                ? `${reduction}% menor que o original`
                : reduction !== null && reduction < 0
                ? `${Math.abs(reduction)}% maior que o original`
                : "Mesmo tamanho do original"}
            </p>
          </div>
          {reduction !== null && reduction > 0 && (
            <span className="text-green-600 dark:text-green-400 font-bold text-lg">−{reduction}%</span>
          )}
        </div>
      )}

      <Button onClick={compress} disabled={compressing}>
        {compressing ? <Loader2 size={15} className="animate-spin" /> : <Minimize2 size={15} />}
        {compressing ? "Comprimindo…" : "Comprimir"}
      </Button>

      {result && (
        <Button variant="outline" onClick={download}>
          <Download size={15} />
          Baixar PDF comprimido
        </Button>
      )}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function PdfTool() {
  const [mode, setMode] = useState<Mode>("idle");
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  const [chosenPageCount, setChosenPageCount] = useState(0);
  const [mergeInitial, setMergeInitial] = useState<MergeItem[]>([]);

  const reset = () => {
    setMode("idle");
    setChosenFile(null);
    setChosenPageCount(0);
    setMergeInitial([]);
  };

  const handleInitialDrop = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => isPdf(f) || isImage(f));
    if (!valid.length) return;

    if (valid.length === 1 && isPdf(valid[0])) {
      try {
        const doc = await PDFDocument.load(await valid[0].arrayBuffer());
        setChosenFile(valid[0]);
        setChosenPageCount(doc.getPageCount());
        setMode("choosing");
      } catch {
        toast.error("Não foi possível ler o PDF.");
      }
      return;
    }

    // Multiple / image → straight to merge
    const items: MergeItem[] = await Promise.all(
      valid.map(async (file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        if (isPdf(file)) {
          let pageCount: number | undefined;
          try { pageCount = (await PDFDocument.load(await file.arrayBuffer())).getPageCount(); } catch { /**/ }
          return { id, file, kind: "pdf" as const, pageCount, thumbnail: null };
        } else {
          const thumbnail = URL.createObjectURL(file);
          return { id, file, kind: "image" as const, pageCount: 1, thumbnail };
        }
      }),
    );
    setMergeInitial(items);
    setMode("merge");
  }, []);

  const goMerge = useCallback(async () => {
    if (!chosenFile) return;
    try {
      const doc = await PDFDocument.load(await chosenFile.arrayBuffer());
      setMergeInitial([
        { id: `${chosenFile.name}-${Date.now()}`, file: chosenFile, kind: "pdf", pageCount: doc.getPageCount(), thumbnail: null },
      ]);
      setMode("merge");
    } catch {
      toast.error("Erro ao carregar PDF.");
    }
  }, [chosenFile]);

  return (
    <div className={cn("p-8 w-full min-h-screen", mode === "idle" && "flex items-center justify-center")}>
      <div className="w-full md:max-w-[600px] mx-auto">

        {mode === "idle" && <DropZone onFiles={handleInitialDrop} />}

        {mode === "choosing" && chosenFile && (
          <div className="flex flex-col gap-4">
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
              <ArrowLeft size={13} /> Novo arquivo
            </button>
            <div className="p-4 border rounded-xl bg-muted/30 flex items-center gap-3">
              <FileText size={24} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{chosenFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(chosenFile.size)} · {chosenPageCount} página{chosenPageCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O que deseja fazer?</p>
            <div className="grid grid-cols-2 gap-3">
              <ActionCard icon={<FileStack size={20} />} title="Mesclar"
                description="Combine com outros PDFs ou imagens" onClick={goMerge} />
              <ActionCard icon={<Scissors size={20} />} title="Dividir"
                description="Extraia páginas específicas" onClick={() => setMode("split")} />
              <ActionCard icon={<RotateCw size={20} />} title="Rotar"
                description="Gire páginas inteiras ou individuais" onClick={() => setMode("rotate")} />
              <ActionCard icon={<Minimize2 size={20} />} title="Comprimir"
                description="Reduza o tamanho do arquivo" onClick={() => setMode("compress")} />
              <ActionCard icon={<FileImage size={20} />} title="Para imagem"
                description="Converta cada página em PNG" onClick={() => setMode("to-image")} />
            </div>
          </div>
        )}

        {mode === "merge" && <MergeView initial={mergeInitial} onBack={reset} />}

        {mode === "split" && chosenFile && (
          <SplitView file={chosenFile} pageCount={chosenPageCount} onBack={reset} />
        )}

        {mode === "to-image" && chosenFile && (
          <ToImageView file={chosenFile} onBack={reset} />
        )}

        {mode === "rotate" && chosenFile && (
          <RotateView file={chosenFile} pageCount={chosenPageCount} onBack={reset} />
        )}

        {mode === "compress" && chosenFile && (
          <CompressView file={chosenFile} pageCount={chosenPageCount} onBack={reset} />
        )}

      </div>
    </div>
  );
}
