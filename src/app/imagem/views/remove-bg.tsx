"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Copy, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CHECKERBOARD } from "../types";
import { BackBtn, ControlsBar } from "../shared";

type BgModel = "isnet_quint8" | "isnet_fp16" | "isnet";
type BgPhase = "idle" | "starting" | "downloading" | "inferring";

const BG_MODELS: { value: BgModel; label: string; size: string; hint: string }[] = [
  { value: "isnet_quint8", label: "Rápido",     size: "~9 MB",  hint: "Boa qualidade" },
  { value: "isnet_fp16",   label: "Balanceado", size: "~18 MB", hint: "Qualidade superior" },
  { value: "isnet",        label: "Preciso",    size: "~36 MB", hint: "Máxima qualidade" },
];

export function RemoveBgView({ file, onBack }: { file: File; onBack: () => void }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [phase, setPhase] = useState<BgPhase>("idle");
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0, show: false });
  const resultUrlRef = useRef<string | null>(null);
  const runRef = useRef(0);
  const [model, setModel] = useLocalStorage<BgModel>("remove-bg-model", "isnet_quint8");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current); };
  }, []);

  const doRemoveBg = async (m: BgModel) => {
    const id = ++runRef.current;
    setPhase("starting");
    setProgress(0);
    const seen = new Map<string, [number, number]>();
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        model: m,
        progress: (key, current, total) => {
          if (runRef.current !== id) return;
          seen.set(key, [current, total]);
          let c = 0, t = 0;
          for (const [cur, tot] of seen.values()) { c += cur; t += tot; }
          if (t > 0) {
            const pct = Math.round((c / t) * 100);
            setProgress(pct);
            setPhase(pct < 100 ? "downloading" : "inferring");
          }
        },
      });
      if (runRef.current !== id) return;
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = URL.createObjectURL(blob);
      setResult(resultUrlRef.current);
    } catch (err) {
      if (runRef.current !== id) return;
      console.error(err);
      toast.error("Erro ao remover fundo.");
    } finally {
      if (runRef.current === id) setPhase("idle");
    }
  };

  const download = () => {
    if (!result) return;
    Object.assign(document.createElement("a"), { href: result, download: `${file.name.replace(/\.[^.]+$/, "")}-sem-fundo.png` }).click();
  };

  const copy = async () => {
    if (!result) return;
    try {
      const blob = await fetch(result).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("Copiado!");
    } catch { toast.error("Erro ao copiar."); }
  };

  const processing = phase !== "idle";

  const phaseLabel: Record<BgPhase, string> = {
    idle: "",
    starting: "Preparando modelo…",
    downloading: `Baixando modelo… ${progress}%`,
    inferring: "Processando imagem…",
  };

  return (
    <div className="flex flex-col gap-6">
      <BackBtn onClick={onBack} />
      <ControlsBar>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modelo de IA</Label>
            <div className="flex gap-2">
              {BG_MODELS.map((m) => (
                <button key={m.value} onClick={() => !processing && setModel(m.value)}
                  disabled={processing}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-center transition-all",
                    model === m.value ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/40 text-muted-foreground",
                    processing && "opacity-60 cursor-not-allowed",
                  )}>
                  <span className="text-xs font-medium leading-tight">{m.label}</span>
                  <span className={cn("text-[10px] leading-tight", model === m.value ? "text-primary-foreground/70" : "text-muted-foreground/60")}>{m.size}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              {BG_MODELS.find((m) => m.value === model)?.hint} · Salvo em cache pelo navegador após o primeiro download
            </p>
          </div>

          {processing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  {phase === "starting"
                    ? <Loader2 size={15} className="animate-spin text-blue-500" />
                    : <Sparkles size={15} className="animate-pulse text-blue-500" />}
                  {phaseLabel[phase]}
                </span>
                {phase === "downloading" && <span className="font-mono text-xs font-medium">{progress}%</span>}
              </div>
              {phase === "starting" && <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary/40 animate-pulse rounded-full w-full" /></div>}
              {phase === "downloading" && <Progress value={progress} className="h-1.5" />}
              {phase === "inferring" && <Progress value={100} className="h-1.5" />}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {result
                ? <Button variant="outline" size="sm" onClick={() => doRemoveBg(model)}><RefreshCw size={14} /> Refazer</Button>
                : <Button size="sm" onClick={() => doRemoveBg(model)}><Sparkles size={14} /> Remover Fundo</Button>
              }
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={copy} disabled={!result}><Copy size={14} /> Copiar</Button>
              <Button size="sm" onClick={download} disabled={!result}><Download size={14} /> Baixar</Button>
            </div>
          )}
        </div>
      </ControlsBar>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
          <div className="rounded-xl overflow-hidden border bg-muted/30">
            {previewUrl && <img src={previewUrl} alt="" className="w-full h-auto" />}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sem fundo</span>
          <div ref={containerRef}
            onMouseMove={(e) => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); setZoom({ x: e.clientX - r.left, y: e.clientY - r.top, show: true }); }}
            onMouseLeave={() => setZoom({ x: 0, y: 0, show: false })}
            className="relative rounded-xl overflow-hidden border min-h-[200px] flex items-center justify-center cursor-none" style={CHECKERBOARD}>
            {processing ? <Sparkles size={40} className="text-blue-500 animate-pulse" />
              : result ? <img src={result} alt="" className="w-full h-auto" />
              : null}
            {zoom.show && result && containerRef.current && (
              <>
                <div className="absolute pointer-events-none rounded-full border-4 border-white shadow-2xl overflow-hidden"
                  style={{ width: 160, height: 160, left: zoom.x - 80, top: zoom.y - 80, zIndex: 10, ...CHECKERBOARD }} />
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
