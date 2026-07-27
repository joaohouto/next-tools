"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

import type { Columns, ExportSettings, Frame } from "../types";
import type { CaptureFn } from "../use-capture";
import { renderSheets } from "../compose";
import { exportPdf, exportPng } from "../export";
import { baseName, loadImage } from "../utils";

/** Enough for a full-width A4 cell at 150 dpi without hoarding memory. */
const EXPORT_WIDTH = 1400;

type Format = "pdf" | "png";

interface ExportPanelProps {
  frames: Frame[];
  capture: CaptureFn;
  videoName: string;
  duration: number;
}

export function ExportPanel({ frames, capture, videoName, duration }: ExportPanelProps) {
  const [format, setFormat] = useState<Format>("pdf");
  const [settings, setSettings] = useState<Omit<ExportSettings, "paginate">>({
    columns: 2,
    showIndex: true,
    showTimecode: true,
    showCaption: true,
    title: "",
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [sheetCount, setSheetCount] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);

  const full: ExportSettings = useMemo(
    () => ({ ...settings, paginate: format === "pdf" }),
    [settings, format],
  );

  const patch = (values: Partial<typeof settings>) =>
    setSettings((prev) => ({ ...prev, ...values }));

  // ─── live preview (built from the thumbnails, so it stays cheap) ────────────

  const signature = useMemo(
    () => JSON.stringify([full, frames.map((f) => [f.id, f.time, f.caption])]),
    [full, frames],
  );
  const debounced = useDebounce(signature, 300);

  const stateRef = useRef({ frames, full, videoName, duration });
  stateRef.current = { frames, full, videoName, duration };

  useEffect(() => {
    let cancelled = false;
    setRendering(true);

    (async () => {
      const { frames: list, full: current, videoName: name, duration: total } = stateRef.current;
      try {
        const sheets = await renderSheets(list, current, (frame) => loadImage(frame.thumb), {
          videoName: name,
          duration: total,
        });
        if (cancelled) return;
        setPreview(sheets[0]?.toDataURL("image/jpeg", 0.8) ?? null);
        setSheetCount(sheets.length);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setPreview(null);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── export ─────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      // Full-resolution frames are grabbed on demand and reused across sheets.
      const cache = new Map<string, string>();
      const getImage = async (frame: Frame) => {
        let source = cache.get(frame.id);
        if (!source) {
          source = (await capture(frame.time, EXPORT_WIDTH, 0.92)).dataUrl;
          cache.set(frame.id, source);
        }
        return loadImage(source);
      };

      const sheets = await renderSheets(frames, full, getImage, { videoName, duration });
      const name = baseName(videoName);

      if (format === "pdf") await exportPdf(sheets, `${name}-quadros`);
      else await exportPng(sheets, `${name}-quadros`);

      toast.success(format === "pdf" ? "PDF exportado!" : "Imagem exportada!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar. Tente reduzir a quantidade de quadros.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-muted/30 lg:sticky lg:top-6">
      <div className="grid grid-cols-2 gap-2">
        <FormatButton
          active={format === "pdf"}
          onClick={() => setFormat("pdf")}
          icon={<FileText size={15} />}
          label="PDF"
          hint="páginas A4"
        />
        <FormatButton
          active={format === "png"}
          onClick={() => setFormat("png")}
          icon={<ImageIcon size={15} />}
          label="Imagem"
          hint="PNG único"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="frames-title" className="text-xs">
          Título
        </Label>
        <Input
          id="frames-title"
          value={settings.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Opcional"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Colunas</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {([1, 2, 3] as Columns[]).map((value) => (
            <button
              key={value}
              onClick={() => patch({ columns: value })}
              className={cn(
                "h-8 rounded-md border text-xs transition-colors",
                settings.columns === value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "bg-background hover:border-foreground/30 text-muted-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Toggle
          id="frames-index"
          label="Numeração"
          checked={settings.showIndex}
          onChange={(v) => patch({ showIndex: v })}
        />
        <Toggle
          id="frames-timecode"
          label="Tempo exato"
          checked={settings.showTimecode}
          onChange={(v) => patch({ showTimecode: v })}
        />
        <Toggle
          id="frames-caption"
          label="Legendas"
          checked={settings.showCaption}
          onChange={(v) => patch({ showCaption: v })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Prévia</Label>
          {sheetCount > 1 && (
            <span className="text-[10px] text-muted-foreground">
              página 1 de {sheetCount}
            </span>
          )}
        </div>
        {/* A single-column PNG sheet can be thousands of pixels tall — cap it so the
            panel stays sticky and the export button never scrolls out of reach. */}
        <div className="relative rounded-lg border overflow-hidden bg-white">
          <div className="max-h-[380px] overflow-y-auto">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Prévia da exportação" className="w-full block" />
            ) : (
              <div className="h-40" />
            )}
          </div>
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Spinner className="size-4 text-black" />
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleExport} disabled={exporting || frames.length === 0}>
        {exporting ? <Spinner className="size-4" /> : <Download />}
        {exporting ? "Exportando…" : format === "pdf" ? "Exportar PDF" : "Exportar imagem"}
      </Button>
    </div>
  );
}

function FormatButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "bg-background hover:border-foreground/30 text-muted-foreground",
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
    </button>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
