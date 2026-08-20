"use client";

import { forwardRef } from "react";
import { getPreviewRatio } from "./helpers";
import type { MosaicConfig, MosaicPhoto, MosaicTemplate } from "./types";

interface MosaicPreviewProps {
  photos: MosaicPhoto[];
  template: MosaicTemplate;
  config: MosaicConfig;
}

const MosaicPreview = forwardRef<HTMLDivElement, MosaicPreviewProps>(
  ({ photos, template, config }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          aspectRatio: getPreviewRatio(config),
          // minmax(0, 1fr), not bare 1fr: 1fr alone is minmax(auto, 1fr), and
          // "auto" lets each <img>'s own intrinsic aspect ratio contribute a
          // minimum track size — producing unequal row/column sizes driven by
          // whichever photo happens to sit there instead of an even split.
          gridTemplateColumns: `repeat(${template.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${template.rows}, minmax(0, 1fr))`,
          gap: `${config.gap}px`,
          borderRadius: `${config.radius}px`,
          backgroundColor: config.backgroundColor,
        }}
        className="grid w-full overflow-hidden shadow-xl"
      >
        {template.cells.map((cell, i) => {
          const photo = photos[i];
          if (!photo) return null;
          return (
            <img
              key={photo.id}
              src={photo.previewUrl}
              alt=""
              style={{
                gridColumn: `${cell.col} / span ${cell.colSpan}`,
                gridRow: `${cell.row} / span ${cell.rowSpan}`,
                borderRadius: `${config.radius}px`,
              }}
              className="h-full w-full min-h-0 min-w-0 object-cover"
            />
          );
        })}
      </div>
    );
  },
);

MosaicPreview.displayName = "MosaicPreview";

export { MosaicPreview };
