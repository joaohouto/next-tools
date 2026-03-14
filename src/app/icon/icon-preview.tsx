"use client";

import { forwardRef } from "react";
import { IconRenderer } from "@/hooks/use-icon-picker";
import CustomSvgFromString from "@/components/svg-string";
import { IconGridTemplate } from "@/components/icon-grid-template";
import type { IconSource, IconConfig } from "./types";

interface IconPreviewProps {
  source: IconSource;
  config: IconConfig;
}

const IconPreview = forwardRef<HTMLDivElement, IconPreviewProps>(
  ({ source, config }, ref) => {
    return (
      <>
        {config.showGuidelines && <IconGridTemplate />}
        <div
          ref={ref}
          id="icon"
          style={{
            background: config.bgColor,
            color: config.fgColor,
            borderRadius: `${config.borderRadius}%`,
          }}
          className="h-[192px] w-[192px] flex items-center justify-center shrink-0 shadow-xl"
        >
          {source.type === "custom" ? (
            <CustomSvgFromString
              svgString={config.customSVGCode}
              size={config.iconSize}
              fill={config.fgColor}
              style={{
                transform: `rotate(${config.iconRotation}deg)`,
              }}
            />
          ) : source.type === "emoji" ? (
            <span
              style={{
                fontSize: config.iconSize * 0.58,
                transform: `rotate(${config.iconRotation}deg)`,
                display: "inline-block",
                lineHeight: 1,
                userSelect: "none",
              }}
              aria-hidden="true"
            >
              {source.char}
            </span>
          ) : (
            <IconRenderer
              icon={source.name}
              strokeWidth={config.iconStrokeWidth}
              size={config.iconSize}
              style={{
                transform: `rotate(${config.iconRotation}deg)`,
              }}
            />
          )}
        </div>
      </>
    );
  }
);

IconPreview.displayName = "IconPreview";

export { IconPreview };
