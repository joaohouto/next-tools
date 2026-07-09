"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Label>Decimal (DD)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={ddLat}
              onChange={(e) => setDdLat(e.target.value)}
              onBlur={applyDd}
              onKeyDown={applyOnEnter(applyDd)}
              placeholder="Latitude"
            />
            <Input
              value={ddLng}
              onChange={(e) => setDdLng(e.target.value)}
              onBlur={applyDd}
              onKeyDown={applyOnEnter(applyDd)}
              placeholder="Longitude"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={!coordinate}
              onClick={() => coordinate && copyCoordinate(coordinate, "dd")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Label>Graus, minutos e segundos (DMS)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={dms}
              onChange={(e) => setDms(e.target.value)}
              onBlur={applyDms}
              onKeyDown={applyOnEnter(applyDms)}
              placeholder={`23°33'01"S 46°38'02"W`}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={!coordinate}
              onClick={() => coordinate && copyCoordinate(coordinate, "dms")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Label>UTM</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              onBlur={applyUtm}
              onKeyDown={applyOnEnter(applyUtm)}
              placeholder="23K 456789E 7345678N"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={!coordinate}
              onClick={() => coordinate && copyCoordinate(coordinate, "utm")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {!coordinate && (
        <p className="text-sm text-muted-foreground">
          Clique no mapa, use sua localização atual ou digite coordenadas decimais para começar.
        </p>
      )}
    </div>
  );
}
