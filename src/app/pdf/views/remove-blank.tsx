"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Eraser, ArrowLeft, ArrowRight, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type BlankPageInfo, type ViewProps } from "../types";
import { getPdfjs, computeInkRatio, makePdfFile, triggerBytesDownload } from "../utils";

const DETECT_SCALE = 1.0; // native 72dpi resolution — high enough to catch faint/light-colored marks
const THUMB_SCALE = 0.35;
const DEFAULT_THRESHOLD_PCT = 0.5;
const MIN_THRESHOLD_PCT = 0.1;
const MAX_THRESHOLD_PCT = 3;

type Tone = "analyzing" | "blank" | "faint" | "content";

function toneOf(inkRatio: number | null, thresholdPct: number): Tone {
  if (inkRatio === null) return "analyzing";
  const t = thresholdPct / 100;
  if (inkRatio > t) return "content";
  if (inkRatio > t * 0.15) return "faint";
  return "blank";
}

function isAutoBlank(inkRatio: number | null, thresholdPct: number): boolean {
  const tone = toneOf(inkRatio, thresholdPct);
  return tone === "blank" || tone === "faint";
}

function ThumbSkeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />;
}

export function RemoveBlankView({ file, pageCount, onBack, onUseResult }: ViewProps) {
  const [pages, setPages] = useState<BlankPageInfo[]>([]);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD_PCT);
  const [analyzing, setAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const thresholdRef = useRef(threshold);

  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  useEffect(() => {
    const controller = new AbortController();
    setPages(
      Array.from({ length: pageCount }, (_, i) => ({
        number: i + 1,
        thumb: null,
        inkRatio: null,
        deleted: false,
      })),
    );
    (async () => {
      try {
        setAnalyzing(true);
        setProgress(0);
        const bytes = await file.arrayBuffer();
        const pdfjs = await getPdfjs();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
        for (let n = 1; n <= pageCount; n++) {
          if (controller.signal.aborted) break;
          const page = await doc.getPage(n);
          const vp = page.getViewport({ scale: DETECT_SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          const inkRatio = computeInkRatio(ctx, canvas.width, canvas.height);

          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = Math.max(1, Math.round(canvas.width * THUMB_SCALE));
          thumbCanvas.height = Math.max(1, Math.round(canvas.height * THUMB_SCALE));
          thumbCanvas.getContext("2d")!.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
          const thumb = thumbCanvas.toDataURL("image/jpeg", 0.75);

          const deleted = isAutoBlank(inkRatio, thresholdRef.current);
          setPages((prev) => prev.map((p) => (p.number === n ? { ...p, thumb, inkRatio, deleted } : p)));
          setProgress(n);
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao analisar o PDF.");
      } finally {
        if (!controller.signal.aborted) setAnalyzing(false);
      }
    })();
    return () => controller.abort();
  }, [file, pageCount]);

  const changeThreshold = (v: number[]) => {
    const next = v[0];
    setThreshold(next);
    setPages((prev) => prev.map((p) => ({ ...p, deleted: isAutoBlank(p.inkRatio, next) })));
    setResultBytes(null);
  };

  const toggleDelete = (num: number) => {
    setPages((prev) => prev.map((p) => (p.number === num ? { ...p, deleted: !p.deleted } : p)));
    setResultBytes(null);
  };

  const deletedCount = pages.filter((p) => p.deleted).length;
  const faintFlaggedCount = pages.filter((p) => p.deleted && toneOf(p.inkRatio, threshold) === "faint").length;

  const save = async () => {
    const active = pages.filter((p) => !p.deleted);
    if (active.length === 0) { toast.error("Pelo menos uma página deve permanecer."); return; }
    setSaving(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      const copiedPages = await out.copyPages(src, active.map((p) => p.number - 1));
      for (const page of copiedPages) out.addPage(page);
      const bytes = await out.save();
      setResultBytes(bytes);
      triggerBytesDownload(bytes, file.name.replace(/\.pdf$/i, "") + "-sem-brancas.pdf");
      toast.success("PDF salvo sem as páginas em branco!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover as páginas em branco.");
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

      <div className="p-3 border rounded-lg bg-muted/30 text-sm">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {pageCount} página{pageCount !== 1 ? "s" : ""}
          {deletedCount > 0 && (
            <span className="ml-1 text-destructive">
              · {deletedCount} identificada{deletedCount !== 1 ? "s" : ""} como em branco
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Sensibilidade · {threshold.toFixed(1)}%</Label>
        <Slider
          min={MIN_THRESHOLD_PCT}
          max={MAX_THRESHOLD_PCT}
          step={0.1}
          value={[threshold]}
          onValueChange={changeThreshold}
        />
        <p className="text-xs text-muted-foreground">
          Páginas com menos desse percentual de conteúdo detectado são marcadas como em branco.
          Valores baixos são mais rigorosos (só marca páginas praticamente vazias).
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 border rounded-lg bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20 text-xs">
        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          A detecção é automática e pode falhar com conteúdo em cor muito clara (texto cinza fraco, marcas d&apos;água, destaques pálidos).
          Revise as páginas destacadas em âmbar abaixo antes de salvar
          {faintFlaggedCount > 0 && (
            <> — <span className="font-medium text-foreground">{faintFlaggedCount}</span> marcada{faintFlaggedCount !== 1 ? "s" : ""} tem vestígios de conteúdo.</>
          )}
          .
        </p>
      </div>

      {analyzing && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${pageCount > 0 ? (progress / pageCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Analisando página {progress} de {pageCount}…
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Clique numa página para manter ou excluir</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {pages.map((p) => {
          const tone = toneOf(p.inkRatio, threshold);
          return (
            <div key={p.number} className="flex flex-col items-center gap-1">
              <button
                onClick={() => toggleDelete(p.number)}
                disabled={p.inkRatio === null}
                className={cn(
                  "relative w-full rounded-lg border-2 overflow-hidden transition-colors focus:outline-none",
                  p.deleted
                    ? tone === "faint"
                      ? "border-amber-500"
                      : "border-destructive"
                    : "border-transparent hover:border-foreground/30",
                )}
              >
                <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {p.thumb ? (
                    <img src={p.thumb} alt={`Página ${p.number}`} className="object-contain w-full h-full" />
                  ) : (
                    <ThumbSkeleton className="w-full h-full" />
                  )}
                </div>

                {p.deleted && (
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      tone === "faint" ? "bg-amber-500/10" : "bg-destructive/10",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1 rounded bg-background/80 flex items-center gap-0.5",
                        tone === "faint" ? "text-amber-600 dark:text-amber-400" : "text-destructive",
                      )}
                    >
                      {tone === "faint" && <AlertTriangle size={9} />}
                      excluir
                    </span>
                  </div>
                )}

                {!p.deleted && p.inkRatio !== null && (
                  <div className="absolute top-1 right-1">
                    <div className="bg-primary rounded-full p-0.5">
                      <Check size={9} className="text-primary-foreground" strokeWidth={3} />
                    </div>
                  </div>
                )}
              </button>

              <span className="text-[10px] text-muted-foreground">{p.number}</span>
              <span className="text-[9px] text-muted-foreground/80">
                {p.inkRatio === null ? "…" : tone === "blank" ? "em branco" : `${(p.inkRatio * 100).toFixed(2)}%`}
              </span>
            </div>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving || analyzing || deletedCount === 0}>
        {saving ? <Spinner className="size-3.5" /> : <Eraser size={15} />}
        {saving ? "Salvando…" : `Remover ${deletedCount} página${deletedCount !== 1 ? "s" : ""} em branco`}
      </Button>

      {resultBytes && (
        <Button
          variant="outline"
          onClick={() =>
            onUseResult(
              makePdfFile(resultBytes, file.name.replace(/\.pdf$/i, "") + "-sem-brancas.pdf"),
              { toolLabel: "Remover em branco", originalName: file.name },
            )
          }
        >
          <ArrowRight size={15} />
          Continuar com este PDF
        </Button>
      )}
    </div>
  );
}
