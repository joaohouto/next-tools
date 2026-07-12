"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fakeHex(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join("");
}

interface GlitchErrorProps {
  phase: "glitching" | "error";
  destination: string;
  lat: string;
  lon: string;
  onReset: () => void;
}

export function GlitchError({ phase, destination, lat, lon, onReset }: GlitchErrorProps) {
  // Generated once per error occurrence, not on every re-render.
  const errorCode = useMemo(() => ({ exception: fakeHex(4), paradox: fakeHex(6) }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black", phase === "glitching" && "animate-glitch")}>
      {phase === "glitching" && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
            }}
          />
          <p className="text-4xl md:text-6xl font-bold text-red-500 font-mono tracking-widest animate-flicker select-none">
            ░▒▓█▓▒░
          </p>
        </>
      )}

      {phase === "error" && (
        <div className="max-w-lg w-full mx-4 rounded-xl border border-red-500/50 bg-zinc-950 p-6 shadow-[0_0_40px_rgba(220,38,38,0.35)] text-center">
          <p className="text-2xl md:text-3xl font-bold text-red-500 mb-3 tracking-tight">
            ERRO: PARADOXO TEMPORAL DETECTADO
          </p>
          <div className="text-left rounded-lg bg-black/60 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-500 leading-relaxed mb-4 overflow-x-auto">
            <p>EXCEPTION 0x{errorCode.exception} at flux.capacitor.overload</p>
            <p>destino: {destination || "—"}</p>
            <p>coordenadas: {lat || "?"}, {lon || "?"}</p>
            <p>codigo: TEMPORAL_PARADOX_{errorCode.paradox}</p>
            <p className="text-zinc-600 mt-1">tente novamente mais tarde. ou mais cedo. depende.</p>
          </div>
          <Button
            variant="outline"
            onClick={onReset}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            REINICIALIZAR SISTEMA
          </Button>
        </div>
      )}
    </div>
  );
}
