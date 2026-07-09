"use client";

import { useState } from "react";
import { Compass, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { bearingToCompass, haversineDistance, initialBearing } from "../distance-utils";
import type { Coordinate } from "../types";

interface DistanceViewProps {
  origin: Coordinate | null;
}

const ZERO_POINT: Coordinate = { lat: 0, lng: 0 };

export function DistanceView({ origin }: DistanceViewProps) {
  const [pointA, setPointA] = useState<Coordinate>(origin ?? ZERO_POINT);
  const [pointB, setPointB] = useState<Coordinate>(ZERO_POINT);
  const [unit, setUnit] = useState<"km" | "mi">("km");

  const distance = haversineDistance(pointA, pointB, unit);
  const bearing = initialBearing(pointA, pointB);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Ponto A</span>
            {origin && (
              <Button
                variant="ghost"
                size="sm"
                className="transition-transform active:scale-95"
                onClick={() => setPointA(origin)}
              >
                Usar local atual
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="number"
              value={pointA.lat}
              onChange={(e) => setPointA({ ...pointA, lat: parseFloat(e.target.value) || 0 })}
              placeholder="Latitude"
              className="bg-background tabular-nums"
            />
            <Input
              type="number"
              value={pointA.lng}
              onChange={(e) => setPointA({ ...pointA, lng: parseFloat(e.target.value) || 0 })}
              placeholder="Longitude"
              className="bg-background tabular-nums"
            />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Ponto B</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="number"
              value={pointB.lat}
              onChange={(e) => setPointB({ ...pointB, lat: parseFloat(e.target.value) || 0 })}
              placeholder="Latitude"
              className="bg-background tabular-nums"
            />
            <Input
              type="number"
              value={pointB.lng}
              onChange={(e) => setPointB({ ...pointB, lng: parseFloat(e.target.value) || 0 })}
              placeholder="Longitude"
              className="bg-background tabular-nums"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums tracking-tight">
            <Ruler className="h-5 w-5 text-muted-foreground" />
            {distance.toFixed(2)} {unit}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Compass className="h-4 w-4" />
            Rumo inicial: {bearing.toFixed(0)}° ({bearingToCompass(bearing)})
          </div>
          <div className="flex gap-2">
            <Button
              variant={unit === "km" ? "default" : "outline"}
              size="sm"
              className="transition-transform active:scale-95"
              onClick={() => setUnit("km")}
            >
              km
            </Button>
            <Button
              variant={unit === "mi" ? "default" : "outline"}
              size="sm"
              className="transition-transform active:scale-95"
              onClick={() => setUnit("mi")}
            >
              milhas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
