// ─── frame-extractor helpers ──────────────────────────────────────────────────

/**
 * Formats accepted by the picker. The `video/*` wildcard covers what browsers
 * usually decode; the explicit extensions are the containers browsers refuse
 * (and sometimes don't even assign a MIME type to) that ffmpeg.wasm handles.
 */
export const ACCEPTED =
  "video/*,.mp4,.webm,.mov,.m4v,.ogv,.asf,.wmv,.avi,.mkv,.flv,.mpg,.mpeg,.3gp,.ts,.vob";

const EXTRA_EXTENSIONS =
  /\.(asf|wmv|avi|mkv|flv|mpe?g|3gp|ts|vob|m4v|ogv|mov|mp4|webm)$/i;

export function isVideo(file: File) {
  return file.type.startsWith("video/") || EXTRA_EXTENSIONS.test(file.name);
}

/** `HH:MM:SS.mmm` (hours dropped when the video is shorter than an hour). */
export function formatTimecode(time: number, withHours = false): string {
  const t = Math.max(0, time);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const head = withHours || h > 0 ? `${pad(h)}:` : "";
  return `${head}${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/** Short `M:SS` label for the timeline ruler. */
export function formatClock(time: number): string {
  const t = Math.max(0, time);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Chooses a readable tick spacing (in seconds) for a ruler of `width` pixels. */
export function rulerStep(duration: number, width: number): number {
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const minPx = 64;
  const maxTicks = Math.max(2, Math.floor(width / minPx));
  return steps.find((s) => duration / s <= maxTicks) ?? steps[steps.length - 1];
}

// ─── video element plumbing ───────────────────────────────────────────────────

/** Loads an off-screen `<video>` and resolves once its metadata is known. */
export function loadVideo(url: string, timeoutMs = 15000): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoad);
      video.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      if (!video.videoWidth || !Number.isFinite(video.duration) || video.duration <= 0) {
        reject(new Error("no-video-track"));
        return;
      }
      resolve(video);
    };
    const onError = () => {
      cleanup();
      reject(new Error("decode-failed"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);

    video.addEventListener("loadedmetadata", onLoad);
    video.addEventListener("error", onError);
    video.src = url;
  });
}

/** Seeks and waits until the frame at `time` is actually available for drawing. */
export function seekTo(video: HTMLVideoElement, time: number, timeoutMs = 10000): Promise<void> {
  const target = clamp(time, 0, Math.max(0, video.duration - 0.001));

  return new Promise((resolve, reject) => {
    const settle = () => {
      cleanup();
      // `seeked` guarantees the frame is decoded, but a paint tick makes
      // drawImage reliable across browsers that lag one frame behind.
      const rvfc = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
        }
      ).requestVideoFrameCallback;
      if (typeof rvfc === "function") {
        const guard = setTimeout(resolve, 300);
        rvfc.call(video, () => {
          clearTimeout(guard);
          resolve();
        });
      } else {
        requestAnimationFrame(() => resolve());
      }
    };
    const onError = () => {
      cleanup();
      reject(new Error("seek-failed"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", settle);
      video.removeEventListener("error", onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("seek-timeout"));
    }, timeoutMs);

    video.addEventListener("seeked", settle);
    video.addEventListener("error", onError);

    if (Math.abs(video.currentTime - target) < 1e-4 && video.readyState >= 2) {
      settle();
      return;
    }
    video.currentTime = target;
  });
}

export interface Capture {
  dataUrl: string;
  /** The time the video actually landed on — this is what gets printed. */
  time: number;
}

/**
 * Seeks `video` and grabs the frame as a JPEG data URL.
 * `maxWidth` downscales for thumbnails; omit it for full-resolution exports.
 */
export async function captureAt(
  video: HTMLVideoElement,
  time: number,
  maxWidth?: number,
  quality = 0.9,
): Promise<Capture> {
  await seekTo(video, time);

  const scale = maxWidth ? Math.min(1, maxWidth / video.videoWidth) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL("image/jpeg", quality), time: video.currentTime };
}

/**
 * True when the browser can decode this source on its own. Metadata alone isn't
 * enough — some containers report a duration and then fail at the first seek —
 * so this also renders one frame before giving the green light.
 */
export async function probePlayable(url: string): Promise<HTMLVideoElement | null> {
  let video: HTMLVideoElement;
  try {
    video = await loadVideo(url);
  } catch {
    return null;
  }
  try {
    await captureAt(video, Math.min(0.1, video.duration / 2), 32, 0.5);
    return video;
  } catch {
    return null;
  }
}

/** Loads a data URL into an `<img>` so the composer can draw it. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

/** Triggers a browser download for a blob, then releases the object URL. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Filename without extension, for naming exports after the source video. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "quadros";
}
