"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanel } from "./control-panel";
import { GlitchError } from "./glitch-error";
import { SEQUENCE_MESSAGES } from "./status-messages";

type Phase = "idle" | "sequencing" | "glitching" | "error";

const SEQUENCE_STEP_MS = 280;
const GLITCH_MS = 700;

export default function MaquinaDoTempoClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [destination, setDestination] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [lastDeparture, setLastDeparture] = useState<Date | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const timers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const engage = useCallback(() => {
    if (!destination) return;
    setLastDeparture(new Date());
    setStatusIndex(0);
    setPhase("sequencing");

    const stepCount = SEQUENCE_MESSAGES.length;
    for (let i = 1; i < stepCount; i++) {
      timers.current.push(setTimeout(() => setStatusIndex(i), i * SEQUENCE_STEP_MS));
    }
    timers.current.push(setTimeout(() => setPhase("glitching"), stepCount * SEQUENCE_STEP_MS));
    timers.current.push(setTimeout(() => setPhase("error"), stepCount * SEQUENCE_STEP_MS + GLITCH_MS));
  }, [destination]);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
  }, []);

  const busy = phase !== "idle";

  return (
    <div className="dark min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <p className="text-emerald-400 font-mono text-xs uppercase tracking-[0.35em] mb-1">Modelo OZ-88</p>
        <h1 className="text-zinc-100 font-mono text-2xl md:text-3xl font-bold tracking-tight">Máquina do Tempo</h1>
      </div>

      <ControlPanel
        destination={destination}
        onDestinationChange={setDestination}
        lat={lat}
        onLatChange={setLat}
        lon={lon}
        onLonChange={setLon}
        lastDeparture={lastDeparture}
        onEngage={engage}
        disabled={busy}
        statusText={phase === "sequencing" ? SEQUENCE_MESSAGES[statusIndex] : undefined}
      />

      {(phase === "glitching" || phase === "error") && (
        <GlitchError phase={phase} destination={destination} lat={lat} lon={lon} onReset={reset} />
      )}
    </div>
  );
}
