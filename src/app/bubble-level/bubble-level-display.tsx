"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDeviceOrientation } from "@/lib/use-device-orientation";

// px per degree of tilt
const SCALE = 15;
// circle geometry (px)
const R = 140;           // outer radius
const BUBBLE_R = 22;     // bubble radius
const MAX_OFFSET = R - BUBBLE_R - 8;
// rings (radius in px → ±degrees = radius / SCALE)
const RING_INNER = 30;   // ±2°
const RING_MID   = 75;   // ±5°

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

interface Props {
  axis?: "x" | "y" | "both";
}

export function BubbleLevelDisplay({ axis = "both" }: Props) {
  const { orientation, isSupported, isStarted, hasPermission, error } =
    useDeviceOrientation();

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    if (!orientation) return;
    const nx = orientation.gamma !== null ? orientation.gamma * -1 : 0;
    const ny = orientation.beta  !== null ? orientation.beta  * -1 : 0;
    setX(axis === "y" ? 0 : nx);
    setY(axis === "x" ? 0 : ny);
  }, [orientation, axis]);

  const bx = clamp(x * SCALE, -MAX_OFFSET, MAX_OFFSET);
  const by = clamp(y * SCALE, -MAX_OFFSET, MAX_OFFSET);

  const active = isStarted && hasPermission && !!orientation;
  const isLevel = active && Math.abs(x) <= 1.5 && Math.abs(y) <= 1.5;

  const stateMsg = (() => {
    if (error?.message.includes("Permission"))
      return "Permissão negada.\nVerifique as configurações do navegador.";
    if (!isSupported) return "Giroscópio não suportado neste navegador.";
    if (!hasPermission) return "Aguardando permissão\npara os sensores de movimento…";
    if (!isStarted) return "Mova o dispositivo para calibrar…";
    return null;
  })();

  const diameter = R * 2;

  return (
    <div className="flex flex-col items-center gap-5">

      {/* Instrument circle */}
      <div
        className={cn(
          "relative rounded-full bg-zinc-900 transition-shadow duration-500",
          isLevel
            ? "shadow-[0_0_0_2px_rgba(74,222,128,0.8),0_0_40px_rgba(74,222,128,0.35)]"
            : "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_24px_rgba(0,0,0,0.5)]",
        )}
        style={{ width: diameter, height: diameter }}
      >
        {/* Mid ring */}
        <div
          className="absolute rounded-full border border-zinc-700/50"
          style={{
            width: RING_MID * 2,
            height: RING_MID * 2,
            top: R - RING_MID,
            left: R - RING_MID,
          }}
        />

        {/* Inner target ring */}
        <div
          className={cn(
            "absolute rounded-full border transition-colors duration-300",
            isLevel ? "border-green-400/70" : "border-zinc-600",
          )}
          style={{
            width: RING_INNER * 2,
            height: RING_INNER * 2,
            top: R - RING_INNER,
            left: R - RING_INNER,
          }}
        />

        {/* Crosshairs */}
        <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-zinc-700/40" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-zinc-700/40" />

        {/* Center dot */}
        <div
          className={cn(
            "absolute rounded-full w-1.5 h-1.5 transition-colors duration-300",
            isLevel ? "bg-green-400" : "bg-zinc-500",
          )}
          style={{ top: R - 3, left: R - 3 }}
        />

        {/* Bubble */}
        {active && (
          <div
            className={cn(
              "absolute rounded-full transition-colors duration-300",
              isLevel
                ? "bg-green-400 shadow-[0_0_16px_rgba(74,222,128,0.9)]"
                : "bg-blue-400  shadow-[0_0_10px_rgba(96,165,250,0.7)]",
            )}
            style={{
              width: BUBBLE_R * 2,
              height: BUBBLE_R * 2,
              top: R - BUBBLE_R,
              left: R - BUBBLE_R,
              transform: `translate(${bx}px,${by}px)`,
              transition: "transform 50ms linear, background-color 300ms, box-shadow 300ms",
              opacity: 0.85,
            }}
          />
        )}

        {/* State message */}
        {stateMsg && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="text-center text-xs text-zinc-400 whitespace-pre-line text-balance leading-relaxed">
              {stateMsg}
            </p>
          </div>
        )}
      </div>

      {/* Angle readout */}
      <div className="flex gap-5 font-mono tabular-nums text-sm h-5">
        {active ? (
          <>
            {(axis === "x" || axis === "both") && (
              <span className={cn(
                "transition-colors duration-200",
                Math.abs(x) <= 1.5 ? "text-green-400" : "text-zinc-400",
              )}>
                {x >= 0 ? "+" : ""}{x.toFixed(1)}°
              </span>
            )}
            {(axis === "y" || axis === "both") && (
              <span className={cn(
                "transition-colors duration-200",
                Math.abs(y) <= 1.5 ? "text-green-400" : "text-zinc-400",
              )}>
                {y >= 0 ? "+" : ""}{y.toFixed(1)}°
              </span>
            )}
          </>
        ) : null}
      </div>

    </div>
  );
}
