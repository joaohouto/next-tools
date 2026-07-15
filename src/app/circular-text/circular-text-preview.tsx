"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { loadFont } from "./font-loader";
import { PX_PER_MM } from "./units";
import type { CircularTextConfig } from "./types";
import type { Font } from "opentype.js";
import { Spinner } from "@/components/spinner";

interface Glyph {
  key: string;
  x: number;
  y: number;
  rotationDeg: number;
  d: string;
  halfAdvance: number;
}

interface CircularTextPreviewProps {
  config: CircularTextConfig;
  onOverflowChange?: (overflowing: boolean) => void;
}

export const CircularTextPreview = forwardRef<
  SVGSVGElement,
  CircularTextPreviewProps
>(function CircularTextPreview({ config, onOverflowChange }, ref) {
  const [font, setFont] = useState<Font | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewBox, setViewBox] = useState("0 0 400 400");
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadFont(config.fontFamily, config.fontWeight)
      .then((f) => {
        if (!cancelled) setFont(f);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(
            `Não foi possível carregar a fonte "${config.fontFamily}"`,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config.fontFamily, config.fontWeight]);

  const layout = useMemo(() => {
    if (!font || config.text.length === 0) {
      return { chars: [] as Glyph[], totalAngleDeg: 0 };
    }

    const chars = Array.from(config.text);
    const radius = Math.max(config.radius, 1);
    const rawAdvances = chars.map((c) =>
      font.getAdvanceWidth(c, config.fontSize),
    );
    const totalWidth =
      rawAdvances.reduce((a, b) => a + b, 0) +
      config.letterSpacing * Math.max(chars.length - 1, 0);
    const totalAngle = totalWidth / radius;

    const dir = config.flip ? -1 : 1;
    const anchorRad = (config.anchorAngle * Math.PI) / 180;
    let startAngle = anchorRad;
    if (config.align === "center")
      startAngle = anchorRad - (dir * totalAngle) / 2;
    else if (config.align === "end") startAngle = anchorRad - dir * totalAngle;

    let cumulative = startAngle;
    const chars_: Glyph[] = chars.map((char, i) => {
      const advance = rawAdvances[i];
      const halfAngle = advance / 2 / radius;
      const centerAngle = cumulative + dir * halfAngle;
      const x = radius * Math.sin(centerAngle);
      const y = -radius * Math.cos(centerAngle);
      const rotationDeg =
        (centerAngle * 180) / Math.PI + (config.flip ? 180 : 0);
      cumulative += dir * ((advance + config.letterSpacing) / radius);

      const d = font.getPath(char, 0, 0, config.fontSize).toPathData(2);
      return {
        key: `${i}-${char}`,
        x,
        y,
        rotationDeg,
        d,
        halfAdvance: advance / 2,
      };
    });

    return { chars: chars_, totalAngleDeg: (totalAngle * 180) / Math.PI };
  }, [
    font,
    config.text,
    config.fontSize,
    config.letterSpacing,
    config.radius,
    config.anchorAngle,
    config.align,
    config.flip,
  ]);

  useEffect(() => {
    onOverflowChange?.(layout.totalAngleDeg > 360);
  }, [layout.totalAngleDeg, onOverflowChange]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || layout.chars.length === 0) return;
    const bbox = group.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return;
    const margin = Math.max(config.fontSize, 16) * 0.5;

    if (config.squareCanvas) {
      // Square centered on the circle's own center (always the origin), sized
      // to contain both the full circle and any glyphs that extend past it.
      const farthestX = Math.max(Math.abs(bbox.x), Math.abs(bbox.x + bbox.width));
      const farthestY = Math.max(Math.abs(bbox.y), Math.abs(bbox.y + bbox.height));
      const half = Math.max(config.radius, farthestX, farthestY) + margin;
      setViewBox(`${-half} ${-half} ${half * 2} ${half * 2}`);
    } else {
      setViewBox(
        `${bbox.x - margin} ${bbox.y - margin} ${bbox.width + margin * 2} ${bbox.height + margin * 2}`,
      );
    }
  }, [layout, config.fontSize, config.radius, config.squareCanvas]);

  const [vbX, vbY, vbW, vbH] = viewBox.split(" ").map(Number);

  // The SVG's own `width`/`height` attributes carry the real physical size
  // (used by whatever opens the exported file); the CSS class below always
  // wins for on-screen sizing inside this app, so this doesn't affect the preview.
  const toPhysical = (px: number) => {
    if (config.unit === "mm") return `${(px / PX_PER_MM).toFixed(2)}mm`;
    if (config.unit === "cm") return `${(px / PX_PER_MM / 10).toFixed(2)}cm`;
    return px;
  };

  return (
    <>
      <svg
        ref={ref}
        viewBox={viewBox}
        width={toPhysical(vbW)}
        height={toPhysical(vbH)}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-[560px] max-h-[560px]"
      >
        {config.bgColor !== "transparent" && (
          <rect
            x={vbX}
            y={vbY}
            width={vbW}
            height={vbH}
            fill={config.bgColor}
          />
        )}
        <g ref={groupRef}>
          {layout.chars.map((c) => (
            <g
              key={c.key}
              transform={`translate(${c.x} ${c.y}) rotate(${c.rotationDeg})`}
            >
              <path
                d={c.d}
                transform={`translate(${-c.halfAdvance} 0)`}
                fill={config.color}
              />
            </g>
          ))}
        </g>
      </svg>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      )}
    </>
  );
});
