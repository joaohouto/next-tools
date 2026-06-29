"use client";

import { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { Scissors, Download, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type SplitStrategy, type SizeUnit, type BookmarkEntry, type SplitPart, type ViewProps,
} from "../types";
import { getPdfjs, fmt, makePdfFile, triggerBytesDownload } from "../utils";

function ThumbSkeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />;
}

function buildEveryN(pageCount: number, n: number): SplitPart[] {
  const step = Math.max(1, n);
  const parts: SplitPart[] = [];
  for (let start = 1; start <= pageCount; start += step) {
    const end = Math.min(start + step - 1, pageCount);
    parts.push({
      label: start === end ? `Página ${start}` : `Páginas ${start}–${end}`,
      pages: Array.from({ length: end - start + 1 }, (_, i) => start + i),
    });
  }
  return parts;
}

function buildEqual(pageCount: number, n: number): SplitPart[] {
  const count = Math.max(2, Math.min(n, pageCount));
  const parts: SplitPart[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * pageCount) / count) + 1;
    const end = Math.floor(((i + 1) * pageCount) / count);
    parts.push({
      label: `Parte ${i + 1} · pág. ${start}–${end}`,
      pages: Array.from({ length: end - start + 1 }, (_, j) => start + j),
    });
  }
  return parts;
}

export function SplitView({ file, pageCount, onBack, onUseResult }: ViewProps) {
  const [strategy, setStrategy] = useState<SplitStrategy>("select");
  const [thumbs, setThumbs] = useState<Map<number, string>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [everyN, setEveryN] = useState(1);
  const [numParts, setNumParts] = useState(2);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[] | null>(null);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [results, setResults] = useState<{ label: string; bytes: Uint8Array }[] | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [targetSize, setTargetSize] = useState(5);
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>("MB");
  const [splitProgress, setSplitProgress] = useState<string | null>(null);

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
          setThumbs((prev) => new Map(prev).set(n, canvas.toDataURL("image/jpeg", 0.75)));
        }
      } catch { /* silent */ }
    })();
    return () => controller.abort();
  }, [file, pageCount]);

  useEffect(() => {
    if (strategy !== "bookmarks" || bookmarks !== null) return;
    setBookmarksLoading(true);
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
        const outline = await doc.getOutline();
        if (!outline?.length) { setBookmarks([]); return; }
        const entries: BookmarkEntry[] = [];
        for (const item of outline) {
          try {
            let dest = item.dest as unknown;
            if (typeof dest === "string") dest = await doc.getDestination(dest);
            if (!Array.isArray(dest) || !dest.length) continue;
            const pageIndex = await doc.getPageIndex(dest[0] as unknown as { num: number; gen: number });
            entries.push({ title: item.title as string, startPage: pageIndex + 1 });
          } catch { /* skip */ }
        }
        entries.sort((a, b) => a.startPage - b.startPage);
        setBookmarks(entries);
      } catch {
        setBookmarks([]);
      } finally {
        setBookmarksLoading(false);
      }
    })();
  }, [strategy]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const getParts = (): SplitPart[] => {
    if (strategy === "select") {
      const sorted = [...selected].sort((a, b) => a - b);
      return sorted.length ? [{ label: `${sorted.length} páginas selecionadas`, pages: sorted }] : [];
    }
    if (strategy === "every-n")    return buildEveryN(pageCount, everyN);
    if (strategy === "equal")      return buildEqual(pageCount, numParts);
    if (strategy === "individual") return Array.from({ length: pageCount }, (_, i) => ({ label: `Página ${i + 1}`, pages: [i + 1] }));
    if (strategy === "bookmarks" && bookmarks?.length) {
      return bookmarks.map((bm, i) => {
        const end = (bookmarks[i + 1]?.startPage ?? pageCount + 1) - 1;
        return { label: bm.title, pages: Array.from({ length: end - bm.startPage + 1 }, (_, j) => bm.startPage + j) };
      });
    }
    return [];
  };

  const previewCount = (() => {
    if (strategy === "select")     return selected.size > 0 ? 1 : 0;
    if (strategy === "every-n")    return Math.ceil(pageCount / Math.max(1, everyN));
    if (strategy === "equal")      return Math.max(2, Math.min(numParts, pageCount));
    if (strategy === "individual") return pageCount;
    if (strategy === "bookmarks")  return bookmarks?.length ?? 0;
    if (strategy === "by-size")    return null;
    return 0;
  })();

  const triggerDownload = (bytes: Uint8Array, name: string) => triggerBytesDownload(bytes, name);

  const downloadAll = async (items: { label: string; bytes: Uint8Array }[]) => {
    const base = file.name.replace(/\.pdf$/i, "");
    for (let i = 0; i < items.length; i++) {
      triggerDownload(items[i].bytes, `${base}-parte${String(i + 1).padStart(2, "0")}.pdf`);
      if (i < items.length - 1) await new Promise((r) => setTimeout(r, 200));
    }
    toast.success(`${items.length} arquivos baixados!`);
  };

  const doSplit = async () => {
    setSplitting(true);
    setResults(null);
    setSplitProgress(null);
    try {
      const srcBytes = await file.arrayBuffer();
      const src = await PDFDocument.load(srcBytes);
      const base = file.name.replace(/\.pdf$/i, "");
      const built: { label: string; bytes: Uint8Array }[] = [];

      if (strategy === "by-size") {
        const limitBytes = Math.max(1, targetSize) * (sizeUnit === "MB" ? 1024 * 1024 : 1024);
        setSplitProgress(`Analisando ${pageCount} páginas…`);
        const pageSizes: number[] = [];
        for (let i = 0; i < pageCount; i++) {
          setSplitProgress(`Analisando página ${i + 1} de ${pageCount}…`);
          const tmp = await PDFDocument.create();
          const [copied] = await tmp.copyPages(src, [i]);
          tmp.addPage(copied);
          pageSizes.push((await tmp.save()).byteLength);
        }
        const groups: number[][] = [[]];
        let accumulated = 0;
        for (let i = 0; i < pageCount; i++) {
          if (groups[groups.length - 1].length > 0 && accumulated + pageSizes[i] > limitBytes) {
            groups.push([]);
            accumulated = 0;
          }
          groups[groups.length - 1].push(i);
          accumulated += pageSizes[i];
        }
        setSplitProgress(`Gerando ${groups.length} arquivo${groups.length !== 1 ? "s" : ""}…`);
        for (const indices of groups) {
          if (!indices.length) continue;
          const out = await PDFDocument.create();
          const copied = await out.copyPages(src, indices);
          copied.forEach((p) => out.addPage(p));
          const bytes = await out.save();
          const startPage = indices[0] + 1;
          const endPage = indices[indices.length - 1] + 1;
          built.push({
            label: startPage === endPage ? `Página ${startPage}` : `Páginas ${startPage}–${endPage}`,
            bytes,
          });
        }
      } else {
        const parts = getParts();
        if (!parts.length) { toast.error("Nenhuma parte para dividir."); return; }
        for (const part of parts) {
          if (!part.pages.length) continue;
          const out = await PDFDocument.create();
          const copied = await out.copyPages(src, part.pages.map((p) => p - 1));
          copied.forEach((p) => out.addPage(p));
          built.push({ label: part.label, bytes: await out.save() });
        }
      }

      if (built.length === 1) {
        triggerDownload(built[0].bytes, `${base}-split.pdf`);
        toast.success("PDF exportado!");
        setResults(built);
      } else {
        setResults(built);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao dividir o PDF.");
    } finally {
      setSplitting(false);
      setSplitProgress(null);
    }
  };

  const STRATEGIES: { id: SplitStrategy; label: string }[] = [
    { id: "select",     label: "Selecionar" },
    { id: "every-n",    label: "A cada N páginas" },
    { id: "equal",      label: "Partes iguais" },
    { id: "individual", label: "Individualmente" },
    { id: "bookmarks",  label: "Por marcadores" },
    { id: "by-size",    label: "Por tamanho" },
  ];

  const isDisabled =
    splitting ||
    (strategy === "select" && selected.size === 0) ||
    (strategy === "bookmarks" && (!bookmarks || !bookmarks.length)) ||
    (strategy === "by-size" && (targetSize <= 0 || isNaN(targetSize)));

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft size={13} /> Voltar
      </button>

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{pageCount} página{pageCount !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Como dividir</Label>
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map((s) => (
            <button key={s.id} onClick={() => { setStrategy(s.id); setResults(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                strategy === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:border-foreground/40",
              )}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {strategy === "select" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Clique nas páginas para selecionar</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}>
                Todas
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs"
                onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                Limpar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => {
              const isSel = selected.has(n);
              const thumb = thumbs.get(n);
              return (
                <button key={n} onClick={() => toggle(n)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-lg border-2 overflow-hidden transition-all focus:outline-none",
                    isSel ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-foreground/30",
                  )}>
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                    {thumb
                      ? <img src={thumb} alt={`Página ${n}`} className="w-full h-full object-cover" />
                      : <ThumbSkeleton className="w-full h-full" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground pb-1">{n}</span>
                  {isSel && (
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
        </>
      )}

      {strategy === "every-n" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="every-n-input">Páginas por parte</Label>
            <Input id="every-n-input" type="number" min={1} max={pageCount} value={everyN}
              onChange={(e) => { setEveryN(Math.max(1, parseInt(e.target.value) || 1)); setResults(null); }} />
          </div>
          <p className="text-xs text-muted-foreground">Gera {previewCount} parte{previewCount !== 1 ? "s" : ""}</p>
        </div>
      )}

      {strategy === "equal" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="equal-parts-input">Número de partes</Label>
            <Input id="equal-parts-input" type="number" min={2} max={pageCount} value={numParts}
              onChange={(e) => { setNumParts(Math.max(2, Math.min(parseInt(e.target.value) || 2, pageCount))); setResults(null); }} />
          </div>
          <p className="text-xs text-muted-foreground">
            ~{Math.ceil(pageCount / Math.max(2, numParts))} página{Math.ceil(pageCount / Math.max(2, numParts)) !== 1 ? "s" : ""} por parte
          </p>
        </div>
      )}

      {strategy === "individual" && (
        <p className="text-xs text-muted-foreground">
          Cada página vira um PDF separado — {pageCount} arquivo{pageCount !== 1 ? "s" : ""} no total.
        </p>
      )}

      {strategy === "bookmarks" && (
        <div className="flex flex-col gap-2">
          {bookmarksLoading && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Spinner className="size-3.5" /> Carregando marcadores…
            </div>
          )}
          {bookmarks !== null && bookmarks.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 border rounded-lg bg-muted/30">
              Este PDF não possui marcadores (outline).
            </p>
          )}
          {bookmarks && bookmarks.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                {bookmarks.length} marcador{bookmarks.length !== 1 ? "es" : ""} encontrado{bookmarks.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto border rounded-lg p-1.5">
                {bookmarks.map((bm, i) => {
                  const end = (bookmarks[i + 1]?.startPage ?? pageCount + 1) - 1;
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                      <span className="truncate flex-1 text-xs">{bm.title}</span>
                      <span className="text-[11px] text-muted-foreground ml-3 shrink-0">
                        pág. {bm.startPage}{end > bm.startPage ? `–${end}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {strategy === "by-size" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Tamanho máximo por arquivo</Label>
            <div className="flex gap-2">
              <Input
                type="number" min={1} step={1}
                value={targetSize}
                onChange={(e) => { setTargetSize(Math.max(1, parseFloat(e.target.value) || 1)); setResults(null); }}
                className="flex-1"
              />
              <div className="flex border rounded-lg overflow-hidden text-xs">
                {(["KB", "MB"] as SizeUnit[]).map((u) => (
                  <button key={u} onClick={() => { setSizeUnit(u); setResults(null); }}
                    className={cn(
                      "px-3 py-1.5 font-medium transition-colors",
                      sizeUnit === u ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            As páginas serão agrupadas até atingir o limite. Tamanhos são estimativas baseadas em páginas individuais.
          </p>
          {splitting && splitProgress && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3" /> {splitProgress}
            </div>
          )}
        </div>
      )}

      {results && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{results.length} parte{results.length !== 1 ? "s" : ""} gerada{results.length !== 1 ? "s" : ""}</p>
            {results.length > 1 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => downloadAll(results)}>
                <Download size={12} /> Baixar tudo
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {results.map((r, i) => {
              const base = file.name.replace(/\.pdf$/i, "");
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Parte {i + 1}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.label} · {fmt(r.bytes.byteLength)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => triggerDownload(r.bytes, `${base}-parte${String(i + 1).padStart(2, "0")}.pdf`)}>
                    <Download size={13} />
                  </Button>
                </div>
              );
            })}
          </div>
          {results.length === 1 && (
            <Button variant="outline" onClick={() =>
              onUseResult(makePdfFile(results[0].bytes, "resultado.pdf"), { toolLabel: "Dividir", originalName: file.name })
            }>
              <ArrowRight size={15} />
              Continuar com este PDF
            </Button>
          )}
        </div>
      )}

      <Button onClick={doSplit} disabled={isDisabled}>
        {splitting ? <Spinner className="size-3.5" /> : <Scissors size={15} />}
        {splitting
          ? (splitProgress ?? "Dividindo…")
          : strategy === "select"
            ? selected.size === 0 ? "Selecione páginas" : `Exportar ${selected.size} página${selected.size !== 1 ? "s" : ""}`
            : strategy === "by-size"
            ? `Dividir por tamanho (máx. ${targetSize} ${sizeUnit})`
            : previewCount
            ? `Dividir em ${previewCount} parte${previewCount !== 1 ? "s" : ""}`
            : "Dividir"}
      </Button>
    </div>
  );
}
