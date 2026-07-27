"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Camera,
  ChevronFirst,
  ChevronLast,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

import type { Frame, VideoSource } from "../types";
import type { CaptureFn } from "../use-capture";
import { clamp, formatClock, formatTimecode, rulerStep } from "../utils";

/** Number of stills painted behind the track. */
const FILMSTRIP_COUNT = 24;
const DEFAULT_FPS = 30;

interface EditorProps {
  source: VideoSource;
  frames: Frame[];
  selectedId: string | null;
  capture: CaptureFn;
  captureReady: boolean;
  onSelect: (id: string | null) => void;
  onAdd: (time: number, tolerance: number) => void;
  onMove: (id: string, time: number) => void;
  onCommit: (id: string, time: number) => void;
  onRemove: (id: string) => void;
}

type Drag = { kind: "scrub" } | { kind: "marker"; id: string };

export function Editor({
  source,
  frames,
  selectedId,
  capture,
  captureReady,
  onSelect,
  onAdd,
  onMove,
  onCommit,
  onRemove,
}: EditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [trackWidth, setTrackWidth] = useState(0);
  const [filmstrip, setFilmstrip] = useState<string[]>([]);

  const { duration } = source;
  const step = 1 / fps;

  // ─── playhead ───────────────────────────────────────────────────────────────
  // Driven by rAF instead of `timeupdate` (which only fires ~4×/s and makes the
  // needle stutter across the track).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    const tick = () => {
      setCurrentTime(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onStop = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
      setCurrentTime(video.currentTime);
    };
    const onSeeked = () => setCurrentTime(video.currentTime);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onStop);
    video.addEventListener("ended", onStop);
    video.addEventListener("seeked", onSeeked);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onStop);
      video.removeEventListener("ended", onStop);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [source.url]);

  // Refines the frame step from the real playback rate the first time it plays.
  useEffect(() => {
    const video = videoRef.current as
      | (HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number })
      | null;
    if (!playing || !video?.requestVideoFrameCallback) return;

    let cancelled = false;
    let previous: number | null = null;
    const deltas: number[] = [];

    const onFrame = (_: number, meta: { mediaTime: number }) => {
      if (cancelled) return;
      if (previous !== null) {
        const delta = meta.mediaTime - previous;
        if (delta > 0.002 && delta < 0.5) deltas.push(delta);
      }
      previous = meta.mediaTime;
      if (deltas.length >= 10) {
        const sorted = [...deltas].sort((a, b) => a - b);
        setFps(Math.round(1 / sorted[Math.floor(sorted.length / 2)]));
        return;
      }
      video.requestVideoFrameCallback!(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
    return () => {
      cancelled = true;
    };
  }, [playing]);

  // ─── filmstrip ──────────────────────────────────────────────────────────────
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
      setCurrentTime(next);
    },
    [duration],
  );

  const nudge = useCallback((delta: number) => seek((videoRef.current?.currentTime ?? 0) + delta), [seek]);

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

  useHotkeys("space", togglePlay, { preventDefault: true }, [togglePlay]);
  useHotkeys("left", () => nudge(-1), { preventDefault: true }, [nudge]);
  useHotkeys("right", () => nudge(1), { preventDefault: true }, [nudge]);
  useHotkeys("shift+left", () => nudge(-step), { preventDefault: true }, [nudge, step]);
  useHotkeys("shift+right", () => nudge(step), { preventDefault: true }, [nudge, step]);
  useHotkeys("home", () => seek(0), { preventDefault: true }, [seek]);
  useHotkeys("end", () => seek(duration), { preventDefault: true }, [seek, duration]);
  useHotkeys("k", addHere, { preventDefault: true }, [addHere]);
  useHotkeys(
    "delete,backspace",
    () => {
      if (selectedId) onRemove(selectedId);
    },
    { preventDefault: true },
    [selectedId, onRemove],
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

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={source.url}
          playsInline
          muted
          preload="auto"
          onClick={togglePlay}
          className="w-full max-h-[52vh] object-contain cursor-pointer"
        />
      </div>

      {/* transport */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => seek(0)} title="Início (Home)">
            <ChevronFirst />
          </Button>
          <Button variant="outline" size="icon" onClick={() => nudge(-step)} title="Quadro anterior (Shift+←)">
            <SkipBack />
          </Button>
          <Button variant="outline" size="icon" onClick={togglePlay} title="Reproduzir (Espaço)">
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => nudge(step)} title="Próximo quadro (Shift+→)">
            <SkipForward />
          </Button>
          <Button variant="outline" size="icon" onClick={() => seek(duration)} title="Fim (End)">
            <ChevronLast />
          </Button>
        </div>

        <div className="text-xs tabular-nums px-2">
          <span className="font-medium">{formatTimecode(currentTime)}</span>
          <span className="text-muted-foreground"> / {formatClock(duration)}</span>
        </div>

        <Button onClick={addHere} disabled={!captureReady} className="ml-auto" title="Capturar quadro (K)">
          <Camera /> Capturar quadro
        </Button>
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
        Clique ou arraste na timeline para navegar · <kbd>←</kbd>/<kbd>→</kbd> 1s ·{" "}
        <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> 1 quadro · <kbd>Espaço</kbd> reproduzir ·{" "}
        <kbd>K</kbd> capturar · <kbd>Del</kbd> excluir o quadro selecionado
      </p>
    </div>
  );
}
