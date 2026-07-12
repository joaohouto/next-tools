"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NOTHING_HAPPENED_MESSAGES, randomFrom } from "./status-messages";

const TOGGLE_LABELS = ["Fluxo Capacitor", "Compressor de Plutônio", "Estabilizador Quântico", "Modo Silencioso"];
const LED_COUNT = 8;

function DigitalReadout({
  label, accent = "emerald", children,
}: {
  label: string;
  accent?: "emerald" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[150px] rounded-xl border bg-black/60 p-3",
        accent === "emerald"
          ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          : "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      )}
    >
      <p className={cn("text-[10px] uppercase tracking-[0.2em] mb-1.5", accent === "emerald" ? "text-emerald-400/70" : "text-amber-400/70")}>
        {label}
      </p>
      {children}
    </div>
  );
}

interface ControlPanelProps {
  destination: string;
  onDestinationChange: (v: string) => void;
  lat: string;
  lon: string;
  onLatChange: (v: string) => void;
  onLonChange: (v: string) => void;
  lastDeparture: Date | null;
  onEngage: () => void;
  disabled: boolean;
  statusText?: string;
}

export function ControlPanel({
  destination, onDestinationChange, lat, lon, onLatChange, onLonChange, lastDeparture, onEngage, disabled, statusText,
}: ControlPanelProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [switches, setSwitches] = useState<Record<string, boolean>>({});
  const [fluxDensity, setFluxDensity] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmtClock = (d: Date) =>
    d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const nudge = () => toast(randomFrom(NOTHING_HAPPENED_MESSAGES));

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 text-zinc-100">
      {/* Time circuits */}
      <div className="flex flex-wrap gap-3">
        <DigitalReadout label="Destino">
          <Input
            type="datetime-local"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            disabled={disabled}
            className="bg-transparent border-0 p-0 h-auto text-emerald-400 font-mono text-base tabular-nums focus-visible:ring-0 [color-scheme:dark]"
          />
        </DigitalReadout>
        <DigitalReadout label="Presente">
          <p className="text-emerald-400 font-mono text-base tabular-nums">
            {now ? fmtClock(now) : "--/--/---- --:--:--"}
          </p>
        </DigitalReadout>
        <DigitalReadout label="Última partida">
          <p className="text-emerald-400 font-mono text-base tabular-nums">
            {lastDeparture ? fmtClock(lastDeparture) : "--/--/---- --:--:--"}
          </p>
        </DigitalReadout>
      </div>

      {/* Coordinates */}
      <div className="rounded-xl border border-amber-500/30 bg-black/60 p-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/70 mb-2">Coordenadas de destino</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-amber-400/50">Latitude</Label>
            <Input
              value={lat}
              onChange={(e) => onLatChange(e.target.value)}
              placeholder="-23.550520"
              disabled={disabled}
              className="bg-transparent border-amber-500/20 text-amber-300 font-mono tabular-nums text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-amber-400/50">Longitude</Label>
            <Input
              value={lon}
              onChange={(e) => onLonChange(e.target.value)}
              placeholder="-46.633308"
              disabled={disabled}
              className="bg-transparent border-amber-500/20 text-amber-300 font-mono tabular-nums text-sm"
            />
          </div>
        </div>
      </div>

      {/* Nonsense control panel */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-3 flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Painel de controle</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {TOGGLE_LABELS.map((label) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">{label}</span>
              <Switch
                checked={!!switches[label]}
                onCheckedChange={(c) => { setSwitches((s) => ({ ...s, [label]: c })); nudge(); }}
                disabled={disabled}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Densidade do fluxo</span>
            <span className="text-xs font-mono text-zinc-500 tabular-nums">{fluxDensity}%</span>
          </div>
          <Slider value={[fluxDensity]} onValueChange={([v]) => setFluxDensity(v)} max={100} step={1} disabled={disabled} />
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          {Array.from({ length: LED_COUNT }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-emerald-400 animate-led-blink"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Engage */}
      <Button
        size="lg"
        onClick={onEngage}
        disabled={disabled || !destination}
        className="w-full h-14 text-base font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] disabled:opacity-40 disabled:shadow-none"
      >
        {statusText ? (
          <>
            <Spinner className="size-4" />
            {statusText}
          </>
        ) : (
          "ATIVAR"
        )}
      </Button>
    </div>
  );
}
