"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Film, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import FileDropzone from "@/components/file-dropzone";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

import type { Frame, PrepareProgress, VideoSource } from "./types";
import { ACCEPTED, fmtBytes, formatClock, isVideo, probePlayable } from "./utils";
import { useCapture } from "./use-capture";
import { Editor } from "./views/editor";
import { FrameList } from "./views/frame-list";
import { ExportPanel } from "./views/export-panel";

/** Width of the thumbnails kept in state — full-resolution frames are only made at export time. */
const THUMB_WIDTH = 360;

/** Transcoding is O(duration); past this the wait stops being reasonable in a tab. */
const MAX_TRANSCODE_BYTES = 500 * 1024 * 1024;

/** The list is always chronological — that's the "em sequência" the export relies on. */
const sortFrames = (list: Frame[]) => [...list].sort((a, b) => a.time - b.time);

const STAGE_LABEL: Record<PrepareProgress["stage"], string> = {
  probing: "Lendo o vídeo…",
  "loading-ffmpeg": "Formato não suportado pelo navegador — carregando o conversor…",
  transcoding: "Convertendo o vídeo…",
};

export default function FramesTool() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<VideoSource | null>(null);
  const [prepare, setPrepare] = useState<PrepareProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const urlRef = useRef<string | null>(null);
  const { capture, ready } = useCapture(source?.url ?? null);

  const releaseUrl = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  useEffect(() => releaseUrl, [releaseUrl]);

  const reset = useCallback(() => {
    releaseUrl();
    setFile(null);
    setSource(null);
    setPrepare(null);
    setError(null);
    setFrames([]);
    setSelectedId(null);
  }, [releaseUrl]);

  const adopt = useCallback(
    (url: string, video: HTMLVideoElement, transcoded: boolean) => {
      urlRef.current = url;
      setSource({
        url,
        transcoded,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      setPrepare(null);
    },
    [],
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      const picked = files.find(isVideo) ?? files[0];
      if (!picked) return;

      reset();
      setFile(picked);
      setPrepare({ stage: "probing", ratio: 0 });

      // 1. Fast path — the browser decodes it natively.
      const url = URL.createObjectURL(picked);
      const native = await probePlayable(url);
      if (native) {
        adopt(url, native, false);
        return;
      }
      URL.revokeObjectURL(url);

      // 2. Fallback — ASF/WMV/AVI/MKV/FLV go through ffmpeg.wasm, loaded on demand.
      if (picked.size > MAX_TRANSCODE_BYTES) {
        setPrepare(null);
        setError(
          `Este formato precisa ser convertido no navegador e o arquivo é grande demais (${fmtBytes(picked.size)}). Converta para MP4 antes de enviar.`,
        );
        return;
      }

      setPrepare({ stage: "loading-ffmpeg", ratio: 0 });
      try {
        const { transcodeToMp4 } = await import("./ffmpeg");
        const blob = await transcodeToMp4(picked, (ratio) =>
          setPrepare({ stage: "transcoding", ratio }),
        );
        const outUrl = URL.createObjectURL(blob);
        const converted = await probePlayable(outUrl);
        if (!converted) {
          URL.revokeObjectURL(outUrl);
          throw new Error("transcode-unreadable");
        }
        adopt(outUrl, converted, true);
      } catch (err) {
        console.error(err);
        setPrepare(null);
        setError(
          "Não foi possível ler este vídeo. O arquivo pode estar corrompido ou usar um codec incomum.",
        );
      }
    },
    [adopt, reset],
  );

  // ─── frame operations ───────────────────────────────────────────────────────

  const addFrame = useCallback(
    async (time: number, tolerance: number) => {
      const existing = frames.find((f) => Math.abs(f.time - time) < tolerance);
      if (existing) {
        setSelectedId(existing.id);
        toast.info("Já existe um quadro nesse ponto.");
        return;
      }
      try {
        const shot = await capture(time, THUMB_WIDTH, 0.72);
        const frame: Frame = {
          id: crypto.randomUUID(),
          time: shot.time,
          thumb: shot.dataUrl,
          caption: "",
        };
        setFrames((prev) => sortFrames([...prev, frame]));
        setSelectedId(frame.id);
      } catch {
        toast.error("Não foi possível capturar este quadro.");
      }
    },
    [capture, frames],
  );

  /** Live update while a marker is being dragged — thumbnail is refreshed on release. */
  const moveFrame = useCallback((id: string, time: number) => {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, time } : f)));
  }, []);

  const commitFrame = useCallback(
    async (id: string, time: number) => {
      try {
        const shot = await capture(time, THUMB_WIDTH, 0.72);
        setFrames((prev) =>
          sortFrames(
            prev.map((f) => (f.id === id ? { ...f, time: shot.time, thumb: shot.dataUrl } : f)),
          ),
        );
      } catch {
        setFrames((prev) => sortFrames(prev));
      }
    },
    [capture],
  );

  const setCaption = useCallback((id: string, caption: string) => {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, caption } : f)));
  }, []);

  const removeFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  // ─── render ─────────────────────────────────────────────────────────────────

  const busy = prepare !== null;

  if (!source) {
    return (
      <div className="p-8 w-full min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md flex flex-col gap-4">
          <FileDropzone
            onUpload={handleUpload}
            accept={ACCEPTED}
            isLoading={busy}
            icon={<Film size={22} className="text-muted-foreground" />}
            title="Extrator de quadros"
            label="Arraste, clique ou cole (Ctrl+V) um vídeo"
          />

          {busy && prepare && (
            <div className="flex flex-col gap-2 px-1">
              <p className="text-xs text-muted-foreground text-center text-balance">
                {STAGE_LABEL[prepare.stage]}
              </p>
              {prepare.stage === "transcoding" ? (
                <Progress value={Math.round(prepare.ratio * 100)} className="h-1.5" />
              ) : (
                <div className="flex justify-center">
                  <Spinner className="size-4" />
                </div>
              )}
              {file && (
                <p className="text-[11px] text-muted-foreground/60 text-center">
                  {file.name} · {fmtBytes(file.size)}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 border rounded-xl bg-destructive/5 border-destructive/30">
              <TriangleAlert size={15} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground text-balance">{error}</p>
            </div>
          )}

          {!busy && (
            <p className="text-[11px] text-muted-foreground/60 text-center text-balance">
              MP4 · WebM · MOV · AVI · MKV · FLV · WMV · ASF — tudo no navegador, sem upload
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full min-h-screen">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft size={13} /> Novo vídeo
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {source.transcoded && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                convertido
              </span>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {file?.name} · {formatClock(source.duration)} · {source.width}×{source.height}
            </p>
          </div>
        </div>

        <Editor
          source={source}
          frames={frames}
          selectedId={selectedId}
          capture={capture}
          captureReady={ready}
          onSelect={setSelectedId}
          onAdd={addFrame}
          onMove={moveFrame}
          onCommit={commitFrame}
          onRemove={removeFrame}
        />

        <div
          className={cn(
            "grid gap-5 items-start",
            frames.length > 0 && "lg:grid-cols-[1fr_320px]",
          )}
        >
          <FrameList
            frames={frames}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCaption={setCaption}
            onRemove={removeFrame}
          />
          {frames.length > 0 && (
            <ExportPanel
              frames={frames}
              capture={capture}
              videoName={file?.name ?? "video"}
              duration={source.duration}
            />
          )}
        </div>
      </div>
    </div>
  );
}
