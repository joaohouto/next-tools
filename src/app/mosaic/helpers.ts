import { MAX_CUSTOM_DIMENSION, MIN_CUSTOM_DIMENSION, RATIO_OPTIONS, SIZE_PRESETS } from "./templates";
import type { JustifiedLayout, MosaicConfig, MosaicPhoto } from "./types";

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

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
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

/** In "smart" mode the ratio is approximate (derived from the photos), so only width is a hard input. */
export function getSmartContainerWidth(config: MosaicConfig): number {
  if (config.aspectRatio === "custom") {
    return clamp(Math.round(config.customWidth), MIN_CUSTOM_DIMENSION, MAX_CUSTOM_DIMENSION);
  }
  return SIZE_PRESETS.find((s) => s.id === config.sizePreset)!.longestEdge;
}

interface PackedGroup {
  indices: number[];
  sumSize: number;
  /** this group's breadth along the shared axis (row height, or column width) */
  weight: number;
}

/**
 * Greedy grouping (the algorithm behind Flickr/Google Photos "justified"
 * galleries): items are added to a group until the group, scaled to a common
 * breadth, would fill `fixedDim` — then that group's breadth is nudged so its
 * extent matches `fixedDim` exactly. Every item is only ever uniformly scaled
 * to its group's breadth, never individually cropped, so each item's own
 * aspect ratio is preserved up to that one group-wide scale step.
 *
 * Every group — including a trailing, under-filled one — is stretched to
 * fill `fixedDim` exactly, matching what the flexbox rendering actually
 * does: a group's items share `flex-grow` in proportion to their sizes, and
 * they always fill 100% of the group regardless of how "full" the algorithm
 * considers it. Reporting a smaller weight for an under-filled group here
 * would just desync the computed layout from the rendered one, distorting
 * whatever item ends up alone in it.
 *
 * `allowSoloTrailing` controls whether a lone leftover item is allowed to
 * stand as its own group (stretched to fill `fixedDim` alone, which can
 * demand an extreme breadth) or gets folded back into the previous group.
 * The caller tries both and keeps whichever fits better — folding back
 * looks more balanced, but with very few items it may be the only option.
 */
function packGreedy(
  sizes: number[],
  fixedDim: number,
  targetBreadth: number,
  gap: number,
  allowSoloTrailing: boolean,
): PackedGroup[] {
  const groups: PackedGroup[] = [];
  let current: number[] = [];
  let sumSize = 0;

  for (let i = 0; i < sizes.length; i++) {
    current.push(i);
    sumSize += sizes[i];
    const dimAtTarget = sumSize * targetBreadth + gap * (current.length - 1);
    const isLastItem = i === sizes.length - 1;
    if (dimAtTarget >= fixedDim && !isLastItem) {
      const availableDim = fixedDim - gap * (current.length - 1);
      groups.push({ indices: current, sumSize, weight: availableDim / sumSize });
      current = [];
      sumSize = 0;
    }
  }
  if (current.length > 0) {
    if (!allowSoloTrailing && groups.length > 0 && current.length < 2) {
      const prev = groups.pop()!;
      current = [...prev.indices, ...current];
      sumSize += prev.sumSize;
    }
    const availableDim = fixedDim - gap * (current.length - 1);
    groups.push({ indices: current, sumSize, weight: availableDim / sumSize });
  }
  return groups;
}

function totalBreadthOf(groups: PackedGroup[], gap: number): number {
  return groups.reduce((sum, g) => sum + g.weight, 0) + gap * Math.max(0, groups.length - 1);
}

/**
 * Packs `sizes` into groups that fill `fixedDim` exactly; the perpendicular
 * total breadth approximates `fixedDim / targetRatio` (searched by sampling
 * many candidate target breadths — not a direct solve, since a small breadth
 * change can jump how many items fit a group and swing the total breadth
 * non-monotonically, which made an earlier binary-search version oscillate).
 * A grouping that stretches a lone item to fill `fixedDim` by itself is
 * penalized (but still eligible) since it can visually dominate the mosaic
 * even when it wins on ratio alone — that tradeoff only gets accepted when
 * there are too few items left for a balanced group to be an option.
 */
function pack(sizes: number[], fixedDim: number, gap: number, targetRatio: number): { groups: PackedGroup[]; resultRatio: number } {
  const desiredBreadth = fixedDim / targetRatio;
  const SAMPLES = 60;
  const SOLO_TRAILING_PENALTY = 1.15;
  const logLo = Math.log(fixedDim / 50);
  const logHi = Math.log(fixedDim * 3);

  let best: PackedGroup[] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
    const targetBreadth = Math.exp(logLo + t * (logHi - logLo));
    for (const allowSoloTrailing of [false, true]) {
      const groups = packGreedy(sizes, fixedDim, targetBreadth, gap, allowSoloTrailing);
      const totalBreadth = totalBreadthOf(groups, gap);
      const diff = Math.abs(totalBreadth - desiredBreadth);
      const hasSoloTrailing = groups.length > 1 && groups[groups.length - 1].indices.length === 1;
      const score = hasSoloTrailing ? diff * SOLO_TRAILING_PENALTY : diff;
      if (score < bestScore) {
        bestScore = score;
        best = groups;
      }
    }
  }

  const groups = best!;
  return { groups, resultRatio: fixedDim / totalBreadthOf(groups, gap) };
}

/**
 * Computes a justified layout for `photos` at `containerWidth`, approximating
 * `desiredRatio`. Tries laying photos out as rows (stacked vertically, width
 * fixed) and as columns (side by side, height fixed — the transpose of the
 * same packing, reusing it via inverted aspect ratios) and keeps whichever
 * gets closer: with very few photos there's often only one degree of
 * freedom, and rows-only packing can be forced far from the target even
 * though a column arrangement of the very same photos lands much closer.
 */
export function computeJustifiedLayout(
  photos: MosaicPhoto[],
  containerWidth: number,
  gap: number,
  desiredRatio: number,
): JustifiedLayout {
  const aspectRatios = photos.map((p) => p.width / p.height);
  const containerHeight = containerWidth / desiredRatio;

  const rowsResult = pack(aspectRatios, containerWidth, gap, desiredRatio);
  const colsResult = pack(
    aspectRatios.map((ar) => 1 / ar),
    containerHeight,
    gap,
    1 / desiredRatio,
  );
  const colsRealRatio = 1 / colsResult.resultRatio;

  const rowsDiff = Math.abs(rowsResult.resultRatio - desiredRatio);
  const colsDiff = Math.abs(colsRealRatio - desiredRatio);

  const { groups, aspectRatio, direction } =
    rowsDiff <= colsDiff
      ? { groups: rowsResult.groups, aspectRatio: rowsResult.resultRatio, direction: "rows" as const }
      : { groups: colsResult.groups, aspectRatio: colsRealRatio, direction: "columns" as const };

  return {
    direction,
    groups: groups.map((g) => ({ photoIndices: g.indices, weight: g.weight })),
    aspectRatio,
  };
}
