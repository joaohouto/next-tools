import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

/**
 * Browsers don't decode ASF/WMV (nor AVI, MKV or FLV), so those files are
 * remuxed to H.264/MP4 here before the editor ever sees them. This module is
 * only ever reached through `await import()`, which keeps the ~32 MB core off
 * the critical path for the formats browsers already handle.
 */

const CORE_VERSION = "0.12.10";
/** Two mirrors: the core is only fetched once, but a blocked CDN would sink the whole feature. */
const CORE_BASES = [
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
];

/** `Duration: 00:01:23.45` in ffmpeg's log — the only reliable total we get. */
const DURATION_RE = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/;

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

/** Loads (once per session) and caches the ffmpeg.wasm instance. */
export function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  if (loading) return loading;

  loading = (async () => {
    const ffmpeg = new FFmpeg();
    let lastError: unknown;

    for (const base of CORE_BASES) {
      try {
        // Fetching through blob URLs keeps the worker same-origin, so the app's
        // COEP policy never has to trust the CDN response directly.
        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        });
        instance = ffmpeg;
        return ffmpeg;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error("ffmpeg-core-unavailable");
  })();

  loading.catch(() => {
    loading = null;
  });

  return loading;
}

function extensionOf(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "bin";
}

/**
 * Converts `file` into an MP4 the browser can play and seek.
 * Audio, subtitle and data streams are dropped — this tool only ever shows
 * still frames, and skipping them roughly halves the conversion time.
 */
export async function transcodeToMp4(
  file: File,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const input = `input.${extensionOf(file.name)}`;
  const output = "output.mp4";

  let totalSeconds = 0;

  const onLog = ({ message }: { message: string }) => {
    if (totalSeconds) return;
    const match = DURATION_RE.exec(message);
    if (match) {
      totalSeconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
  };

  const onTick = ({ progress, time }: { progress: number; time: number }) => {
    // ffmpeg's own `progress` is unreliable for containers without a declared
    // duration, so prefer processed-time over the duration parsed from the log.
    const ratio = totalSeconds > 0 ? time / 1e6 / totalSeconds : progress;
    onProgress(Math.min(1, Math.max(0, ratio || 0)));
  };

  ffmpeg.on("log", onLog);
  ffmpeg.on("progress", onTick);

  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    await ffmpeg.exec([
      "-i", input,
      "-map", "0:v:0",
      // Escaped comma: inside a filtergraph a bare `,` would start a new filter.
      "-vf", "scale=min(1920\\,iw):-2",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-an", "-sn", "-dn",
      "-movflags", "+faststart",
      output,
    ]);

    const data = await ffmpeg.readFile(output);
    onProgress(1);
    return new Blob([data as BlobPart], { type: "video/mp4" });
  } finally {
    ffmpeg.off("log", onLog);
    ffmpeg.off("progress", onTick);
    await ffmpeg.deleteFile(input).catch(() => {});
    await ffmpeg.deleteFile(output).catch(() => {});
  }
}
