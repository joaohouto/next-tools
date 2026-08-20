import { MAX_CUSTOM_DIMENSION, MIN_CUSTOM_DIMENSION, RATIO_OPTIONS, SIZE_PRESETS } from "./templates";
import type { MosaicConfig } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Data URLs, not object URLs: html-to-image cache-busts every embedded <img>
 * src by appending `?timestamp`, which breaks `blob:` URLs (they don't
 * tolerate query strings) and silently fails the export/copy.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Width/height ratio (width ÷ height) driving the live preview box's CSS `aspect-ratio`. */
export function getPreviewRatio(config: MosaicConfig): number {
  if (config.aspectRatio === "custom") {
    return config.customWidth / config.customHeight;
  }
  return RATIO_OPTIONS.find((r) => r.id === config.aspectRatio)!.ratio;
}

/** Real output pixel dimensions, passed as canvasWidth/canvasHeight to exportAsImage/copyImage. */
export function getExportDimensions(config: MosaicConfig): { width: number; height: number } {
  if (config.aspectRatio === "custom") {
    return {
      width: clamp(Math.round(config.customWidth), MIN_CUSTOM_DIMENSION, MAX_CUSTOM_DIMENSION),
      height: clamp(Math.round(config.customHeight), MIN_CUSTOM_DIMENSION, MAX_CUSTOM_DIMENSION),
    };
  }
  const ratio = getPreviewRatio(config);
  const longestEdge = SIZE_PRESETS.find((s) => s.id === config.sizePreset)!.longestEdge;
  return ratio >= 1
    ? { width: longestEdge, height: Math.round(longestEdge / ratio) }
    : { width: Math.round(longestEdge * ratio), height: longestEdge };
}
