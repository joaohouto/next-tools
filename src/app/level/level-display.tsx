"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDeviceOrientation } from "@/lib/use-device-orientation";

const SCALE = 15;         // px per degree for bubble position
const R = 140;            // outer radius (px)
const BUBBLE_R = 22;      // bubble radius (px)
const MAX_OFFSET = R - BUBBLE_R - 8;
const RING_INNER = 30;    // ±2°
const RING_MID = 75;      // ±5°
const BAR_RANGE = 12;     // degrees for full bar deflection

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// Horizontal tilt bar — shows left/right tilt (gamma)
function HorizBar({ value, width, isLevel }: { value: number; width: number; isLevel: boolean }) {
  const pct = clamp((value / BAR_RANGE) * 50 + 50, 2, 98);
  return (
    <div
      className="relative rounded-full bg-zinc-800/70"
      style={{ width, height: 7 }}
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600/80 -translate-x-1/2" />
      <div
        className={cn(
          "absolute top-[3px] bottom-[3px] w-3 rounded-full",
          isLevel ? "bg-green-400/90" : "bg-blue-400/70",
        )}
        style={{
          left: `calc(${pct}% - 6px)`,
          transition: "left 50ms linear, background-color 300ms",
        }}
      />
    </div>
  );
}

// Vertical tilt bar — shows front/back tilt (beta)
function VertBar({ value, height, isLevel }: { value: number; height: number; isLevel: boolean }) {
  const pct = clamp((value / BAR_RANGE) * 50 + 50, 2, 98);
  return (
    <div
      className="relative rounded-full bg-zinc-800/70"
      style={{ width: 7, height }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-600/80 -translate-y-1/2" />
      <div
        className={cn(
          "absolute left-[3px] right-[3px] h-3 rounded-full",
          isLevel ? "bg-green-400/90" : "bg-blue-400/70",
        )}
        style={{
          top: `calc(${pct}% - 6px)`,
          transition: "top 50ms linear, background-color 300ms",
        }}
      />
    </div>
  );
}

export function LevelDisplay() {
  const { orientation, isSupported, isStarted, hasPermission, error } =
    useDeviceOrientation();

  const [x, setX] = useState(0); // gamma-based (left/right)
  const [y, setY] = useState(0); // beta-based (front/back)

  useEffect(() => {
    if (!orientation) return;
    setX(orientation.gamma !== null ? orientation.gamma * -1 : 0);
    setY(orientation.beta !== null ? orientation.beta * -1 : 0);
  }, [orientation]);

  const bx = clamp(x * SCALE, -MAX_OFFSET, MAX_OFFSET);
  const by = clamp(y * SCALE, -MAX_OFFSET, MAX_OFFSET);

  const active = isStarted && hasPermission && !!orientation;
  const xLevel = Math.abs(x) <= 1.5;
  const yLevel = Math.abs(y) <= 1.5;
  const isLevel = active && xLevel && yLevel;

  const stateMsg = (() => {
    if (error?.message === "HTTPS required")
      return "Requer conexão segura (HTTPS)\npara acessar os sensores do dispositivo.";
    if (error?.message.includes("Permission"))
      return "Permissão negada.\nVerifique as configurações do navegador.";
    if (!isSupported) return "Giroscópio não suportado\nneste dispositivo ou navegador.";
    if (!hasPermission) return "Aguardando permissão\npara os sensores de movimento…";
    if (!isStarted) return "Mova o dispositivo para calibrar…";
    return null;
  })();

  const diameter = R * 2;
  const GAP = 6;

  return (
    <div className="flex flex-col items-center gap-5">

      {/* Instrument + tilt bars */}
      <div className="flex flex-col" style={{ gap: GAP }}>
        {/* Top row: circle + vertical bar */}
        <div className="flex" style={{ gap: GAP }}>

          {/* Main circle */}
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
              style={{ width: RING_MID * 2, height: RING_MID * 2, top: R - RING_MID, left: R - RING_MID }}
            />

            {/* Inner target ring */}
            <div
              className={cn(
                "absolute rounded-full border transition-colors duration-300",
                isLevel ? "border-green-400/70" : "border-zinc-600",
              )}
              style={{ width: RING_INNER * 2, height: RING_INNER * 2, top: R - RING_INNER, left: R - RING_INNER }}
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

          {/* Vertical tilt bar (beta — front/back) */}
          <div className="flex flex-col items-center justify-center gap-1.5">
            {active
              ? <VertBar value={y} height={diameter} isLevel={yLevel} />
              : <div style={{ width: 7, height: diameter }} className="rounded-full bg-zinc-800/30" />}
          </div>
        </div>

        {/* Bottom row: horizontal tilt bar */}
        <div className="flex items-center gap-1.5">
          {active
            ? <HorizBar value={x} width={diameter} isLevel={xLevel} />
            : <div style={{ width: diameter, height: 7 }} className="rounded-full bg-zinc-800/30" />}
        </div>
      </div>

      {/* Angle readouts */}
      <div className="flex gap-5 font-mono tabular-nums text-sm h-5">
        {active ? (
          <>
            <span className={cn("transition-colors duration-200", xLevel ? "text-green-400" : "text-zinc-400")}>
              {x >= 0 ? "+" : ""}{x.toFixed(1)}° H
            </span>
            <span className={cn("transition-colors duration-200", yLevel ? "text-green-400" : "text-zinc-400")}>
              {y >= 0 ? "+" : ""}{y.toFixed(1)}° V
            </span>
          </>
        ) : null}
      </div>

    </div>
  );
}
