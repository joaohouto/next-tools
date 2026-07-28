"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import {
  Camera,
  ChevronFirst,
  ChevronLast,
  Crop as CropIcon,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

import type { CropRect, Frame, VideoSource } from "../types";
import type { CaptureFn } from "../use-capture";
import {
  clamp,
  cropAspect,
  FULL_CROP,
  formatClock,
  formatTimecode,
  rulerStep,
  seekTo,
  withFrameCallback,
} from "../utils";
import { CropBox } from "./crop-box";

import "react-image-crop/dist/ReactCrop.css";

/** Number of stills painted behind the track. */
const FILMSTRIP_COUNT = 24;
/** Tallest the player may get, as a CSS length — also drives the crop overlay's box. */
const PLAYER_MAX_HEIGHT = "52vh";

interface EditorProps {
  source: VideoSource;
  frames: Frame[];
  selectedId: string | null;
  crop: CropRect | null;
  fps: number;
  capture: CaptureFn;
  captureReady: boolean;
  onSelect: (id: string | null) => void;
  onAdd: (time: number, tolerance: number) => void;
  onMove: (id: string, time: number) => void;
  onCommit: (id: string, time: number) => void;
  onRemove: (id: string) => void;
  onCrop: (crop: CropRect | null) => void;
}

type Drag = { kind: "scrub" } | { kind: "marker"; id: string };

const toRect = (percent: PercentCrop): CropRect => ({
  x: clamp(percent.x / 100, 0, 1),
  y: clamp(percent.y / 100, 0, 1),
  width: clamp(percent.width / 100, 0.02, 1),
  height: clamp(percent.height / 100, 0.02, 1),
});

const toPercent = (rect: CropRect): PercentCrop => ({
  unit: "%",
  x: rect.x * 100,
  y: rect.y * 100,
  width: rect.width * 100,
  height: rect.height * 100,
});

export function Editor({
  source,
  frames,
  selectedId,
  crop,
  fps,
  capture,
  captureReady,
  onSelect,
  onAdd,
  onMove,
  onCommit,
  onRemove,
  onCrop,
}: EditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  /** Timestamp of the frame currently on screen — the anchor for frame stepping. */
  const presentedRef = useRef(0);
  const steppingRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [filmstrip, setFilmstrip] = useState<string[]>([]);

  const { duration } = source;
  const step = 1 / fps;

  // ─── playhead ───────────────────────────────────────────────────────────────
  // `requestVideoFrameCallback` fires once per presented frame and reports the
  // frame's true timestamp, which makes it both smoother and more accurate than
  // `timeupdate` (~4×/s) or reading back `currentTime` (just an echo of the seek).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const withCallback = withFrameCallback(video);
    let handle = 0;
    let raf = 0;

    if (withCallback) {
      const onFrame = (_: number, meta: { mediaTime: number }) => {
        presentedRef.current = meta.mediaTime;
        setCurrentTime(meta.mediaTime);
        handle = withCallback.requestVideoFrameCallback(onFrame);
      };
      handle = withCallback.requestVideoFrameCallback(onFrame);
    }

    const tick = () => {
      presentedRef.current = video.currentTime;
      setCurrentTime(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      if (!withCallback) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    };
    const onStop = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
      if (!withCallback) setCurrentTime(video.currentTime);
    };
    const onSeeked = () => {
      if (!withCallback) setCurrentTime(video.currentTime);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onStop);
    video.addEventListener("ended", onStop);
    video.addEventListener("seeked", onSeeked);
    return () => {
      cancelAnimationFrame(raf);
      if (withCallback && handle) withCallback.cancelVideoFrameCallback(handle);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onStop);
      video.removeEventListener("ended", onStop);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [source.url]);

  // ─── filmstrip ──────────────────────────────────────────────────────────────
  // Deliberately uncropped: the strip is the map of the whole video, so it stays
  // useful for navigating even after the user zooms into a corner of the frame.
  useEffect(() => {
    if (!captureReady) return;
    let cancelled = false;

    (async () => {
      const shots: string[] = [];
      for (let i = 0; i < FILMSTRIP_COUNT; i++) {
        if (cancelled) return;
        const time = ((i + 0.5) / FILMSTRIP_COUNT) * duration;
        try {
          const shot = await capture(time, 160, 0.5);
          shots.push(shot.dataUrl);
        } catch {
          shots.push("");
        }
        if (!cancelled) setFilmstrip([...shots]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [captureReady, capture, duration]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width));
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  // ─── transport ──────────────────────────────────────────────────────────────

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(time, 0, duration);
      video.currentTime = next;
      if (!withFrameCallback(video)) {
        presentedRef.current = next;
        setCurrentTime(next);
      }
    },
    [duration],
  );

  /**
   * Moves exactly one frame, whichever rate the video actually runs at.
   *
   * Seeking by a flat `1/fps` looks right but breaks on variable-rate video —
   * screen and browser recordings routinely mix frames from half to double the
   * nominal duration, so a fixed jump skips frames on the short ones and stalls
   * on the long ones. Instead the seek head creeps outward a quarter-frame at a
   * time and stops at the first offset that presents a *different* timestamp:
   * that is the neighbouring frame by construction, never a later one.
   */
  const stepFrame = useCallback(
    async (direction: 1 | -1) => {
      const video = videoRef.current;
      if (!video || steppingRef.current) return;
      video.pause();

      if (!withFrameCallback(video)) {
        // No frame timestamps available (Firefox): fall back to the measured rate.
        const index =
          direction > 0
            ? Math.floor(video.currentTime * fps + 1e-6)
            : Math.ceil(video.currentTime * fps - 1e-6);
        seek((index + direction) / fps + 1e-4);
        return;
      }

      steppingRef.current = true;
      try {
        const anchor = presentedRef.current;
        const increment = step / 4;
        for (let attempt = 1; attempt <= 16; attempt++) {
          const target = anchor + direction * increment * attempt;
          if (target < 0 || target > duration) return;
          const presented = await seekTo(video, target);
          if (presented === null) continue;
          if (Math.abs(presented - anchor) > 1e-4) return;
        }
      } catch {
        /* the seek failed; leaving the playhead put is the honest outcome */
      } finally {
        steppingRef.current = false;
      }
    },
    [duration, fps, seek, step],
  );

  const nudge = useCallback(
    (seconds: number) => {
      videoRef.current?.pause();
      seek((videoRef.current?.currentTime ?? 0) + seconds);
    },
    [seek],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const addHere = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    onAdd(video.currentTime, step);
  }, [onAdd, step]);

  const editing = { enabled: !cropping, preventDefault: true };

  useHotkeys("space", togglePlay, { preventDefault: true }, [togglePlay]);
  useHotkeys("left", () => stepFrame(-1), editing, [stepFrame, cropping]);
  useHotkeys("right", () => stepFrame(1), editing, [stepFrame, cropping]);
  useHotkeys("shift+left", () => nudge(-1), editing, [nudge, cropping]);
  useHotkeys("shift+right", () => nudge(1), editing, [nudge, cropping]);
  useHotkeys("home", () => seek(0), editing, [seek, cropping]);
  useHotkeys("end", () => seek(duration), editing, [seek, duration, cropping]);
  useHotkeys("k", addHere, { preventDefault: true }, [addHere]);
  useHotkeys(
    "delete,backspace",
    () => {
      if (selectedId) onRemove(selectedId);
    },
    editing,
    [selectedId, onRemove, cropping],
  );

  // Clicking a marker (or a card in the list) moves the needle to that frame.
  const framesRef = useRef(frames);
  framesRef.current = frames;
  useEffect(() => {
    if (!selectedId) return;
    const frame = framesRef.current.find((f) => f.id === selectedId);
    if (frame) seek(frame.time);
  }, [selectedId, seek]);

  // ─── pointer interaction on the track ───────────────────────────────────────

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return 0;
      return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
    },
    [duration],
  );

  const beginDrag = useCallback(
    (event: React.PointerEvent, drag: Drag) => {
      event.preventDefault();
      videoRef.current?.pause();
      dragRef.current = drag;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

      const time = timeFromClientX(event.clientX);
      if (drag.kind === "scrub") {
        onSelect(null);
        seek(time);
      } else {
        onSelect(drag.id);
      }
    },
    [onSelect, seek, timeFromClientX],
  );

  const continueDrag = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const time = timeFromClientX(event.clientX);
      seek(time);
      if (drag.kind === "marker") onMove(drag.id, time);
    },
    [onMove, seek, timeFromClientX],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
      if (drag.kind === "marker") onCommit(drag.id, timeFromClientX(event.clientX));
    },
    [onCommit, timeFromClientX],
  );

  // ─── ruler ──────────────────────────────────────────────────────────────────

  const ticks = useMemo(() => {
    if (!trackWidth || !duration) return [];
    const gap = rulerStep(duration, trackWidth);
    const result: number[] = [];
    for (let t = gap; t < duration; t += gap) result.push(t);
    return result;
  }, [duration, trackWidth]);

  const pct = (time: number) => `${(time / duration) * 100}%`;
  const buildingStrip = filmstrip.length < FILMSTRIP_COUNT;

  // While picking the area the player has to show the whole frame; the rest of
  // the time it shows the crop, which is the zoom the user asked for.
  const displayCrop = cropping ? FULL_CROP : (crop ?? FULL_CROP);
  const displayAspect = cropAspect(displayCrop, source.width, source.height);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <div
          className="relative w-full"
          style={{ maxWidth: `calc(${PLAYER_MAX_HEIGHT} * ${displayAspect})` }}
        >
          <ReactCrop
            crop={cropping && crop ? toPercent(crop) : undefined}
            onChange={(_, percent) => onCrop(toRect(percent))}
            disabled={!cropping}
            minWidth={24}
            minHeight={24}
            className="block w-full rounded-xl overflow-hidden bg-black"
          >
            <CropBox crop={displayCrop} sourceWidth={source.width} sourceHeight={source.height}>
              <video
                ref={videoRef}
                src={source.url}
                playsInline
                muted
                preload="auto"
                onClick={cropping ? undefined : togglePlay}
                className={cropping ? undefined : "cursor-pointer"}
              />
            </CropBox>
          </ReactCrop>

          {cropping && !crop && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
              <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px]">
                Arraste sobre o vídeo para definir a área
              </span>
            </div>
          )}
        </div>
      </div>

      {/* transport */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => seek(0)} title="Início (Home)">
            <ChevronFirst />
          </Button>
          <Button variant="outline" size="icon" onClick={() => stepFrame(-1)} title="Quadro anterior (←)">
            <SkipBack />
          </Button>
          <Button variant="outline" size="icon" onClick={togglePlay} title="Reproduzir (Espaço)">
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => stepFrame(1)} title="Próximo quadro (→)">
            <SkipForward />
          </Button>
          <Button variant="outline" size="icon" onClick={() => seek(duration)} title="Fim (End)">
            <ChevronLast />
          </Button>
        </div>

        <div className="text-xs tabular-nums px-1">
          <span className="font-medium">{formatTimecode(currentTime)}</span>
          <span className="text-muted-foreground"> / {formatClock(duration)}</span>
          <span className="text-muted-foreground/60"> · {fps} fps</span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {crop && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCrop(null);
                setCropping(false);
              }}
              title="Remover o recorte"
            >
              Limpar
            </Button>
          )}
          <Button
            variant={cropping || crop ? "secondary" : "outline"}
            size="icon"
            onClick={() => setCropping((value) => !value)}
            title={cropping ? "Concluir recorte" : "Recortar / aproximar"}
          >
            <CropIcon />
          </Button>
          <Button onClick={addHere} disabled={!captureReady} title="Capturar quadro (K)">
            <Camera /> Capturar quadro
          </Button>
        </div>
      </div>

      {/* timeline */}
      <div ref={trackRef} className="relative h-20 select-none touch-none">
        <div
          onPointerDown={(e) => beginDrag(e, { kind: "scrub" })}
          onPointerMove={continueDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute inset-0 rounded-xl overflow-hidden border bg-muted cursor-pointer"
        >
          <div className="absolute inset-0 flex">
            {filmstrip.map((src, i) =>
              src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" draggable={false} className="h-full flex-1 min-w-0 object-cover" />
              ) : (
                <div key={i} className="h-full flex-1 min-w-0 bg-muted-foreground/10" />
              ),
            )}
          </div>

          {buildingStrip && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60">
              <Spinner className="size-4" />
              <span className="text-[11px] text-muted-foreground">montando a timeline…</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          {ticks.map((tick) => (
            <div key={tick} className="absolute bottom-0 pointer-events-none" style={{ left: pct(tick) }}>
              <div className="h-2 w-px bg-white/50" />
              <span className="absolute bottom-2.5 left-1 text-[10px] text-white/80 tabular-nums whitespace-nowrap">
                {formatClock(tick)}
              </span>
            </div>
          ))}
        </div>

        {/* needle — red on purpose, so it never reads as one more marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-40 -translate-x-1/2"
          style={{ left: pct(currentTime) }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-3 rounded-full bg-red-500 ring-2 ring-background" />
        </div>

        {/* markers */}
        {frames.map((frame, index) => {
          const active = frame.id === selectedId;
          return (
            <div
              key={frame.id}
              onPointerDown={(e) => beginDrag(e, { kind: "marker", id: frame.id })}
              onPointerMove={continueDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ left: pct(frame.time) }}
              className="group absolute -top-2 bottom-0 z-30 -translate-x-1/2 px-2 cursor-grab active:cursor-grabbing touch-none"
              title={`Quadro ${index + 1} — ${formatTimecode(frame.time)}`}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center h-4 min-w-4 px-1 rounded text-[10px] font-medium tabular-nums shadow ring-1 ring-background transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-foreground text-background",
                )}
              >
                {index + 1}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(frame.id);
                  }}
                  title="Excluir quadro"
                  className="absolute -top-2 -right-2 hidden group-hover:flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground ring-1 ring-background"
                >
                  <X size={9} />
                </button>
              </div>
              <div
                className={cn(
                  "absolute top-4 bottom-0 left-1/2 w-0.5 -translate-x-1/2",
                  active ? "bg-primary" : "bg-foreground/70",
                )}
              />
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        {cropping ? (
          <>
            Arraste sobre o vídeo para escolher a área — o recorte vale para todos os quadros
            exportados. Clique de novo em <CropIcon size={11} className="inline -mt-0.5" /> para
            concluir.
          </>
        ) : (
          <>
            Clique ou arraste na timeline para navegar · <kbd>←</kbd>/<kbd>→</kbd> 1 quadro ·{" "}
            <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> 1s · <kbd>Espaço</kbd> reproduzir ·{" "}
            <kbd>K</kbd> capturar · <kbd>Del</kbd> excluir o quadro selecionado
          </>
        )}
      </p>
    </div>
  );
}
