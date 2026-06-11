"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
} from "react";
import { PDFDocument, type PDFImage } from "pdf-lib";
import {
  FileText,
  Scissors,
  FileImage,
  FileStack,
  GripVertical,
  Trash2,
  Download,
  ArrowLeft,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

type Mode = "idle" | "choosing" | "merge" | "split" | "to-image";

interface MergeItem {
  id: string;
  file: File;
  kind: "pdf" | "image";
  pageCount?: number;
  previewUrl?: string;
}

interface PageImage {
  number: number;
  dataUrl: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES =
  "application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp";

function isPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function parseRanges(input: string, total: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) pages.add(i);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= total) pages.add(n);
    }
  }
  return [...pages].sort((a, b) => a - b);
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
        (blob) => blob ? blob.arrayBuffer().then(resolve).catch(reject) : reject(new Error("blob failed")),
        "image/png",
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
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
    if (!list) return;
    const files = Array.from(list).filter((f) => isPdf(f) || isImage(f));
    if (files.length) onFiles(files);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    handle(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 select-none",
        over ? "border-primary bg-primary/5" : "border-foreground/20 hover:border-foreground/40",
        compact ? "py-4 px-6" : "py-16 px-8",
      )}
    >
      <FileText
        size={compact ? 20 : 36}
        className={cn("text-muted-foreground", over && "text-primary")}
      />
      <p className="text-sm text-muted-foreground text-center text-balance">
        {label ?? "Arraste PDFs ou imagens aqui"}
      </p>
      {!compact && (
        <p className="text-xs text-muted-foreground/60">
          Mesclar · Dividir · Converter para imagem
        </p>
      )}
      <input
        ref={ref}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}

// ─── action card ──────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left w-full"
    >
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

// ─── merge view ───────────────────────────────────────────────────────────────

function MergeView({
  initial,
  onBack,
}: {
  initial: MergeItem[];
  onBack: () => void;
}) {
  const [items, setItems] = useState<MergeItem[]>(initial);
  const [merging, setMerging] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => {
    return () => previews.current.forEach(URL.revokeObjectURL);
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const added: MergeItem[] = await Promise.all(
      files.map(async (file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        if (isPdf(file)) {
          try {
            const doc = await PDFDocument.load(await file.arrayBuffer());
            return { id, file, kind: "pdf" as const, pageCount: doc.getPageCount() };
          } catch {
            return { id, file, kind: "pdf" as const };
          }
        } else {
          const previewUrl = URL.createObjectURL(file);
          previews.current.push(previewUrl);
          return { id, file, kind: "image" as const, pageCount: 1, previewUrl };
        }
      }),
    );
    setItems((p) => [...p, ...added]);
  }, []);

  const remove = (id: string) => {
    setItems((p) => {
      const item = p.find((i) => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previews.current = previews.current.filter((u) => u !== item.previewUrl);
      }
      return p.filter((i) => i.id !== id);
    });
  };

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
      const bytes = await doc.save();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
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
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={13} /> Voltar
      </button>

      <DropZone
        onFiles={addFiles}
        compact
        label="Adicionar mais arquivos"
      />

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
              "flex items-center gap-2 p-3 border rounded-lg bg-muted/30 transition-all",
              dragIdx === i && "opacity-40",
              overIdx === i && dragIdx !== i && "ring-2 ring-primary ring-offset-1",
            )}
          >
            <GripVertical
              size={16}
              className="text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
            />
            <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
              {i + 1}
            </span>

            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt=""
                className="h-9 w-9 object-cover rounded border shrink-0"
              />
            ) : (
              <div className="h-9 w-9 flex items-center justify-center rounded border bg-muted shrink-0">
                <FileText size={16} className="text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(item.file.size)}
                {item.pageCount != null &&
                  ` · ${item.pageCount} pág${item.pageCount !== 1 ? "s" : ""}`}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={() => remove(item.id)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={merge} disabled={merging || items.length < 2}>
        <Download size={15} />
        {merging ? "Mesclando…" : `Baixar PDF mesclado`}
      </Button>
    </div>
  );
}

// ─── split view ───────────────────────────────────────────────────────────────

function SplitView({
  file,
  pageCount,
  onBack,
}: {
  file: File;
  pageCount: number;
  onBack: () => void;
}) {
  const [range, setRange] = useState(`1-${pageCount}`);
  const [splitting, setSplitting] = useState(false);

  const selected = parseRanges(range, pageCount);

  const split = async () => {
    if (selected.length === 0) { toast.error("Nenhuma página válida."); return; }
    setSplitting(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, selected.map((n) => n - 1));
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), {
        href: url,
        download: file.name.replace(/\.pdf$/i, "") + "-split.pdf",
      }).click();
      URL.revokeObjectURL(url);
      toast.success(`${selected.length} página${selected.length !== 1 ? "s" : ""} exportada${selected.length !== 1 ? "s" : ""}!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao dividir.");
    } finally {
      setSplitting(false);
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

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {pageCount} página{pageCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="range">Páginas a extrair</Label>
        <Input
          id="range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          placeholder="Ex: 1-3, 5, 7-9"
        />
        <p className="text-xs text-muted-foreground">
          {selected.length > 0
            ? `${selected.length} página${selected.length !== 1 ? "s" : ""} selecionada${selected.length !== 1 ? "s" : ""}: ${selected.join(", ")}`
            : "Use vírgula para separar e hífen para intervalos."}
        </p>
      </div>

      <Button onClick={split} disabled={splitting || selected.length === 0}>
        <Download size={15} />
        {splitting ? "Dividindo…" : "Baixar páginas selecionadas"}
      </Button>
    </div>
  );
}

// ─── to-image view ────────────────────────────────────────────────────────────

function ToImageView({ file, onBack }: { file: File; onBack: () => void }) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(2);
  const fileRef = useRef(file);

  const render = useCallback(async (f: File, s: number) => {
    setRendering(true);
    setPages([]);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
      const out: PageImage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: s });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        out.push({ number: i, dataUrl: canvas.toDataURL("image/png") });
      }
      setPages(out);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao converter o PDF.");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => { render(fileRef.current, scale); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeScale = (v: number[]) => {
    setScale(v[0]);
    render(fileRef.current, v[0]);
  };

  const download = (page: PageImage) => {
    const name = file.name.replace(/\.pdf$/i, "");
    Object.assign(document.createElement("a"), {
      href: page.dataUrl,
      download: `${name}-p${page.number}.png`,
    }).click();
  };

  const downloadAll = () => pages.forEach(download);

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
      </div>

      <div className="flex flex-col gap-2">
        <Label>Qualidade · {scale}×</Label>
        <Slider
          min={1}
          max={4}
          step={0.5}
          value={[scale]}
          onValueChange={changeScale}
          disabled={rendering}
        />
        <p className="text-xs text-muted-foreground">
          1× = 72 dpi · 2× = 144 dpi · 4× = 288 dpi
        </p>
      </div>

      {rendering && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" />
          Convertendo…
        </div>
      )}

      {pages.length > 0 && (
        <>
          <Button onClick={downloadAll} disabled={rendering}>
            <Download size={15} />
            Baixar todas ({pages.length} imagem{pages.length !== 1 ? "ns" : ""})
          </Button>

          <div className="flex flex-col gap-3">
            {pages.map((page) => (
              <div key={page.number} className="border rounded-xl overflow-hidden">
                <img src={page.dataUrl} alt={`Página ${page.number}`} className="w-full h-auto" />
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <span className="text-xs text-muted-foreground">Página {page.number}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => download(page)}
                  >
                    <Download size={12} /> PNG
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

    // Single PDF → choosing
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

    // Multiple or image → merge directly
    const items: MergeItem[] = await Promise.all(
      valid.map(async (file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        if (isPdf(file)) {
          try {
            const doc = await PDFDocument.load(await file.arrayBuffer());
            return { id, file, kind: "pdf" as const, pageCount: doc.getPageCount() };
          } catch {
            return { id, file, kind: "pdf" as const };
          }
        } else {
          const previewUrl = URL.createObjectURL(file);
          return { id, file, kind: "image" as const, pageCount: 1, previewUrl };
        }
      }),
    );
    setMergeInitial(items);
    setMode("merge");
  }, []);

  // ── choosing: pre-load chosen file into merge items
  const goMerge = useCallback(async () => {
    if (!chosenFile) return;
    try {
      const doc = await PDFDocument.load(await chosenFile.arrayBuffer());
      setMergeInitial([
        { id: `${chosenFile.name}-${Date.now()}`, file: chosenFile, kind: "pdf", pageCount: doc.getPageCount() },
      ]);
      setMode("merge");
    } catch {
      toast.error("Erro ao carregar PDF.");
    }
  }, [chosenFile]);

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[600px] mx-auto">

        {mode === "idle" && (
          <DropZone onFiles={handleInitialDrop} />
        )}

        {mode === "choosing" && chosenFile && (
          <div className="flex flex-col gap-4">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ActionCard
                icon={<FileStack size={20} />}
                title="Mesclar"
                description="Combine com outros PDFs ou imagens"
                onClick={goMerge}
              />
              <ActionCard
                icon={<Scissors size={20} />}
                title="Dividir"
                description="Extraia páginas específicas"
                onClick={() => setMode("split")}
              />
              <ActionCard
                icon={<FileImage size={20} />}
                title="Para imagem"
                description="Converta cada página em PNG"
                onClick={() => setMode("to-image")}
              />
            </div>
          </div>
        )}

        {mode === "merge" && (
          <MergeView initial={mergeInitial} onBack={reset} />
        )}

        {mode === "split" && chosenFile && (
          <SplitView file={chosenFile} pageCount={chosenPageCount} onBack={reset} />
        )}

        {mode === "to-image" && chosenFile && (
          <ToImageView file={chosenFile} onBack={reset} />
        )}

      </div>
    </div>
  );
}
