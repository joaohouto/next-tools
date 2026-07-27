"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureAt, loadVideo, type Capture } from "./utils";

export type CaptureFn = (
  time: number,
  maxWidth?: number,
  quality?: number,
) => Promise<Capture>;

/**
 * Owns an off-screen `<video>` dedicated to grabbing frames, so seeking for a
 * thumbnail never disturbs the `currentTime` the user is watching in the player.
 *
 * A single element can only serve one seek at a time, so every request goes
 * through a promise chain — capturing a filmstrip while dragging a marker would
 * otherwise interleave seeks and hand back frames from the wrong moment.
 */
export function useCapture(url: string | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    videoRef.current = null;
    if (!url) return;

    let cancelled = false;
    loadVideo(url)
      .then((video) => {
        if (cancelled) return;
        videoRef.current = video;
        setReady(true);
      })
      .catch(() => {
        /* the caller already probed the source; nothing useful to do here */
      });

    return () => {
      cancelled = true;
      const video = videoRef.current;
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
      videoRef.current = null;
    };
  }, [url]);

  const capture = useCallback<CaptureFn>((time, maxWidth, quality) => {
    const job = () => {
      const video = videoRef.current;
      if (!video) return Promise.reject(new Error("capture-not-ready"));
      return captureAt(video, time, maxWidth, quality);
    };
    const run = queueRef.current.then(job, job);
    queueRef.current = run.catch(() => {});
    return run;
  }, []);

  return { capture, ready };
}
