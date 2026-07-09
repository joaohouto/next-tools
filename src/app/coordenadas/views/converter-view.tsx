"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import {
  ddToDms,
  ddToUtm,
  dmsToDd,
  formatDMS,
  formatUTM,
  parseDMSString,
  parseUTMString,
} from "../coordinate-utils";
import { copyCoordinate } from "../share-utils";
import type { Coordinate } from "../types";
import { CoordinateSystemsHint } from "./coordinate-systems-hint";

interface ConverterViewProps {
  coordinate: Coordinate | null;
  onChange: (coord: Coordinate) => void;
}

export function ConverterView({ coordinate, onChange }: ConverterViewProps) {
  const [ddLat, setDdLat] = useState("");
  const [ddLng, setDdLng] = useState("");
  const [dms, setDms] = useState("");
  const [utm, setUtm] = useState("");

  useEffect(() => {
    if (!coordinate) return;
    setDdLat(coordinate.lat.toFixed(6));
    setDdLng(coordinate.lng.toFixed(6));
    setDms(formatDMS(ddToDms(coordinate)));
    setUtm(formatUTM(ddToUtm(coordinate)));
  }, [coordinate]);

  const applyDd = () => {
    const lat = parseFloat(ddLat);
    const lng = parseFloat(ddLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) onChange({ lat, lng });
  };

  const applyDms = () => {
    const parsed = parseDMSString(dms);
    if (parsed) onChange(parsed);
  };

  const applyUtm = () => {
    const parsed = parseUTMString(utm);
    if (parsed) onChange(parsed);
  };

  const applyOnEnter = (apply: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      apply();
      e.currentTarget.blur();
    }
  };

  const copyButton = (format: "dd" | "dms" | "utm", label: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 transition-transform active:scale-95"
          disabled={!coordinate}
          onClick={() => coordinate && copyCoordinate(coordinate, format)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Formatos</span>
          <CoordinateSystemsHint />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Decimal (DD)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={ddLat}
              onChange={(e) => setDdLat(e.target.value)}
              onBlur={applyDd}
              onKeyDown={applyOnEnter(applyDd)}
              placeholder="Latitude"
              className="bg-background tabular-nums"
            />
            <Input
              value={ddLng}
              onChange={(e) => setDdLng(e.target.value)}
              onBlur={applyDd}
              onKeyDown={applyOnEnter(applyDd)}
              placeholder="Longitude"
              className="bg-background tabular-nums"
            />
            {copyButton("dd", "Copiar coordenadas (DD)")}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Graus, minutos e segundos (DMS)
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={dms}
              onChange={(e) => setDms(e.target.value)}
              onBlur={applyDms}
              onKeyDown={applyOnEnter(applyDms)}
              placeholder={`23°33'01"S 46°38'02"W`}
              className="bg-background tabular-nums"
            />
            {copyButton("dms", "Copiar coordenadas (DMS)")}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">UTM</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              onBlur={applyUtm}
              onKeyDown={applyOnEnter(applyUtm)}
              placeholder="23K 456789E 7345678N"
              className="bg-background tabular-nums"
            />
            {copyButton("utm", "Copiar coordenadas (UTM)")}
          </div>
        </div>
      </div>

      {!coordinate && (
        <p className="text-center text-sm text-muted-foreground">
          Clique no mapa, use sua localização atual ou digite coordenadas decimais para começar.
        </p>
      )}
    </div>
  );
}
