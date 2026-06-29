"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { fileToDataUrl, loadImage } from "../helpers";
import { BackBtn, ControlsBar } from "../shared";

export function VectorizeView({ file, onBack }: { file: File; onBack: () => void }) {
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
          <input type="range" min={0} max={255} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} disabled={processing}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500" />
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
              {processing
                ? <div className="flex flex-col items-center gap-2"><RefreshCw size={32} className="text-blue-500 animate-spin" /><span className="text-sm text-muted-foreground">Vetorizando…</span></div>
                : svg ? <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full [&_svg]:w-full [&_svg]:h-auto" />
                : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
