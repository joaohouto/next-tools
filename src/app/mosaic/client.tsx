"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CopyIcon, DownloadIcon, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import FileDropzone from "@/components/file-dropzone";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { copyImage, exportAsImage } from "@/lib/export-image";
import {
  computeJustifiedLayout,
  fileToDataUrl,
  getExportDimensions,
  getImageDimensions,
  getPreviewRatio,
  getSmartContainerWidth,
} from "./helpers";
import { MosaicPreview } from "./mosaic-preview";
import { MosaicSettings } from "./mosaic-settings";
import { PhotoStrip } from "./photo-strip";
import { BENTO_TEMPLATES, generateTemplate } from "./templates";
import type { MosaicConfig, MosaicPhoto } from "./types";

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 30;

const DEFAULT_CONFIG: MosaicConfig = {
  templateCategory: "grid",
  bentoTemplateId: null,
  aspectRatio: "square",
  sizePreset: "md",
  customWidth: 2048,
  customHeight: 2048,
  gap: 8,
  radius: 0,
  backgroundColor: "#FFFFFF",
};

export default function Client() {
  const [photos, setPhotos] = useState<MosaicPhoto[]>([]);
  const [config, setConfig] = useState<MosaicConfig>(DEFAULT_CONFIG);
  const [busy, setBusy] = useState<"copy" | "download" | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const updateConfig = (updates: Partial<MosaicConfig>) => setConfig((prev) => ({ ...prev, ...updates }));

  const addPhotos = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      const room = MAX_PHOTOS - photos.length;
      if (room <= 0) {
        toast.error(`Limite de ${MAX_PHOTOS} fotos atingido.`);
        return;
      }
      const accepted = images.slice(0, room);
      if (accepted.length < images.length) {
        toast.info(`Apenas ${accepted.length} de ${images.length} fotos foram adicionadas (máximo de ${MAX_PHOTOS}).`);
      }
      const newItems: MosaicPhoto[] = await Promise.all(
        accepted.map(async (file) => {
          const previewUrl = await fileToDataUrl(file);
          const { width, height } = await getImageDimensions(previewUrl);
          return {
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file,
            previewUrl,
            width,
            height,
          };
        }),
      );
      setPhotos((prev) => [...prev, ...newItems]);
    },
    [photos.length],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reorderPhotos = useCallback((from: number, to: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const resetAll = () => {
    setPhotos([]);
    setConfig(DEFAULT_CONFIG);
  };

  const activeTemplate = useMemo(() => {
    if (photos.length < MIN_PHOTOS || config.templateCategory === "smart") return null;
    if (config.templateCategory === "bento") {
      return BENTO_TEMPLATES.find((t) => t.id === config.bentoTemplateId && t.cells.length === photos.length) ?? null;
    }
    return generateTemplate(config.templateCategory, photos.length);
  }, [config.templateCategory, config.bentoTemplateId, photos.length]);

  useEffect(() => {
    if (config.templateCategory === "bento" && photos.length >= MIN_PHOTOS && activeTemplate === null) {
      setConfig((prev) => ({ ...prev, templateCategory: "grid", bentoTemplateId: null }));
      toast.info("O modelo bento escolhido não cabe mais — usando grade automática.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate, config.templateCategory, photos.length]);

  const smartLayout = useMemo(() => {
    if (config.templateCategory !== "smart" || photos.length < MIN_PHOTOS) return null;
    const containerWidth = getSmartContainerWidth(config);
    return computeJustifiedLayout(photos, containerWidth, config.gap, getPreviewRatio(config));
  }, [config, photos]);

  const exportDimensions = useMemo(() => {
    if (smartLayout) {
      const width = getSmartContainerWidth(config);
      return { width, height: Math.round(width / smartLayout.aspectRatio) };
    }
    return getExportDimensions(config);
  }, [config, smartLayout]);

  // Paste-to-add stays live once the editor replaces the upload gate: FileDropzone's
  // own paste listener only exists while it's mounted, i.e. before MIN_PHOTOS is reached.
  useEffect(() => {
    if (photos.length < MIN_PHOTOS) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) addPhotos(files);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [photos.length, addPhotos]);

  const handleCopy = async () => {
    setBusy("copy");
    try {
      await copyImage(previewRef.current, {
        canvasWidth: exportDimensions.width,
        canvasHeight: exportDimensions.height,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      await exportAsImage(previewRef.current, "mosaico", {
        canvasWidth: exportDimensions.width,
        canvasHeight: exportDimensions.height,
      });
      toast.success("Mosaico exportado!");
    } finally {
      setBusy(null);
    }
  };

  if (photos.length < MIN_PHOTOS) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col gap-4">
          <FileDropzone
            onUpload={addPhotos}
            accept="image/*"
            multiple
            icon={<LayoutGrid size={22} className="text-muted-foreground" />}
            title="Mosaico de Fotos"
            label="Arraste, clique ou cole (Ctrl+V) suas fotos"
          />
          <p className="text-center text-xs text-muted-foreground">
            {photos.length === 0
              ? `Envie pelo menos ${MIN_PHOTOS} fotos para montar o mosaico — tudo processado no navegador, sem upload.`
              : `Falta pelo menos ${MIN_PHOTOS - photos.length} foto para começar.`}
          </p>
          {photos.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {photos.map((p) => (
                <img key={p.id} src={p.previewUrl} alt="" className="h-14 w-14 rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const template = activeTemplate ?? generateTemplate("grid", photos.length);

  return (
    <div className="w-screen h-screen p-3 flex flex-col gap-3 lg:flex-row lg:p-4">
      {/* Preview + photo strip */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={13} /> Recomeçar
        </button>

        <div className="flex-1 min-h-0 rounded-xl border overflow-y-auto flex items-center justify-center p-4 bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px]">
          <div className="w-full max-w-2xl">
            {smartLayout ? (
              <MosaicPreview ref={previewRef} kind="smart" photos={photos} justified={smartLayout} config={config} />
            ) : (
              <MosaicPreview ref={previewRef} kind="grid" photos={photos} template={template} config={config} />
            )}
          </div>
        </div>

        <PhotoStrip
          photos={photos}
          onReorder={reorderPhotos}
          onRemove={removePhoto}
          onAddFiles={addPhotos}
          canAddMore={photos.length < MAX_PHOTOS}
        />
      </div>

      {/* Settings sidebar */}
      <div className="flex flex-col rounded-xl border overflow-hidden lg:w-[300px] lg:min-w-[300px] min-h-0">
        <MosaicSettings config={config} photoCount={photos.length} onConfigChange={updateConfig} />

        <div className="shrink-0 grid grid-cols-2 gap-2 p-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={busy !== null}>
            {busy === "copy" ? <Spinner className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            Copiar
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={busy !== null}>
            {busy === "download" ? <Spinner className="size-3.5" /> : <DownloadIcon className="size-3.5" />}
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
