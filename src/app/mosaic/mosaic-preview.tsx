"use client";

import { forwardRef } from "react";
import { getPreviewRatio } from "./helpers";
import type { JustifiedLayout, MosaicConfig, MosaicPhoto, MosaicTemplate } from "./types";

type MosaicPreviewProps = { photos: MosaicPhoto[]; config: MosaicConfig } & (
  | { kind: "grid"; template: MosaicTemplate }
  | { kind: "smart"; justified: JustifiedLayout }
);

// CSS flex-grow only distributes the fraction of free space equal to the sum
// of grow factors when that sum is below 1 (e.g. one flex item alone with
// flex-grow: 0.75 only fills 75% of its container, leaving the rest empty) —
// scaling every weight up by the same constant keeps their relative
// proportions but keeps the sum comfortably above 1 in any real case.
const FLEX_SCALE = 1000;

const MosaicPreview = forwardRef<HTMLDivElement, MosaicPreviewProps>((props, ref) => {
  const { photos, config } = props;
  const aspectRatio = props.kind === "smart" ? props.justified.aspectRatio : getPreviewRatio(config);

  return (
    <div
      ref={ref}
      style={{
        aspectRatio,
        borderRadius: `${config.radius}px`,
        backgroundColor: config.backgroundColor,
      }}
      className="w-full overflow-hidden shadow-xl"
    >
      {props.kind === "smart" ? (
        (() => {
          const isRows = props.justified.direction === "rows";
          return (
            <div
              style={{
                display: "flex",
                flexDirection: isRows ? "column" : "row",
                gap: `${config.gap}px`,
                height: "100%",
                width: "100%",
              }}
            >
              {props.justified.groups.map((group, gi) => (
                <div
                  key={gi}
                  style={{
                    display: "flex",
                    flexDirection: isRows ? "row" : "column",
                    gap: `${config.gap}px`,
                    flex: `${group.weight * FLEX_SCALE} 0 0`,
                    minWidth: 0,
                    minHeight: 0,
                  }}
                >
                  {group.photoIndices.map((pi) => {
                    const photo = photos[pi];
                    if (!photo) return null;
                    const photoWeight = isRows ? photo.width / photo.height : photo.height / photo.width;
                    return (
                      <img
                        key={photo.id}
                        src={photo.previewUrl}
                        alt=""
                        style={{
                          flex: `${photoWeight * FLEX_SCALE} 0 0`,
                          minWidth: 0,
                          minHeight: 0,
                          borderRadius: `${config.radius}px`,
                        }}
                        className={isRows ? "h-full object-cover" : "w-full object-cover"}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        <div
          style={{
            display: "grid",
            // minmax(0, 1fr), not bare 1fr: 1fr alone is minmax(auto, 1fr), and
            // "auto" lets each <img>'s own intrinsic aspect ratio contribute a
            // minimum track size — producing unequal row/column sizes driven by
            // whichever photo happens to sit there instead of an even split.
            gridTemplateColumns: `repeat(${props.template.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${props.template.rows}, minmax(0, 1fr))`,
            gap: `${config.gap}px`,
            height: "100%",
            width: "100%",
          }}
        >
          {props.template.cells.map((cell, i) => {
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
      )}
    </div>
  );
});

MosaicPreview.displayName = "MosaicPreview";

export { MosaicPreview };
