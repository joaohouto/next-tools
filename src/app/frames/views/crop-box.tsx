"use client";

import { cn } from "@/lib/utils";

import type { CropRect } from "../types";
import { cropAspect } from "../utils";

/**
 * Shows only the cropped region of a video or image, scaled up to fill the box —
 * the "zoom" the crop produces.
 *
 * The child is stretched to `1/crop.width × 1/crop.height` of a box that already
 * carries the crop's aspect ratio, which works out to the source's own aspect,
 * so nothing is ever squashed and no `object-fit` is involved. With `FULL_CROP`
 * it degenerates to "just show the media", so callers never branch.
 *
 * Width comes from the parent; height follows from the aspect ratio. Callers that
 * need a height cap set `max-width: <cap> * aspect` on a wrapper — capping the
 * height directly would break the ratio, since it yields to the width the parent
 * hands down.
 */
export function CropBox({
  crop,
  sourceWidth,
  sourceHeight,
  className,
  children,
}: {
  crop: CropRect;
  sourceWidth: number;
  sourceHeight: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden w-full", className)}
      style={{ aspectRatio: String(cropAspect(crop, sourceWidth, sourceHeight)) }}
    >
      <div
        className="absolute [&>*]:w-full [&>*]:h-full [&>*]:block"
        style={{
          width: `${100 / crop.width}%`,
          height: `${100 / crop.height}%`,
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
