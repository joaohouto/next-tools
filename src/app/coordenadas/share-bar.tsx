"use client";

import { Copy, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { copyCoordinate, googleMapsUrl, osmUrl, wazeUrl } from "./share-utils";
import type { Coordinate } from "./types";

interface ShareBarProps {
  coordinate: Coordinate | null;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function ShareBar({ coordinate }: ShareBarProps) {
  if (!coordinate) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {coordinate.lat.toFixed(6)}, {coordinate.lng.toFixed(6)}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => copyCoordinate(coordinate, "dd")}>
            <Copy className="h-3.5 w-3.5" /> DD
          </Button>
          <Button variant="outline" size="sm" onClick={() => copyCoordinate(coordinate, "dms")}>
            <Copy className="h-3.5 w-3.5" /> DMS
          </Button>
          <Button variant="outline" size="sm" onClick={() => copyCoordinate(coordinate, "utm")}>
            <Copy className="h-3.5 w-3.5" /> UTM
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => openInNewTab(googleMapsUrl(coordinate))}>
          <ExternalLink className="h-3.5 w-3.5" /> Google Maps
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openInNewTab(osmUrl(coordinate))}>
          <ExternalLink className="h-3.5 w-3.5" /> OpenStreetMap
        </Button>
        <Button variant="secondary" size="sm" onClick={() => openInNewTab(wazeUrl(coordinate))}>
          <ExternalLink className="h-3.5 w-3.5" /> Waze
        </Button>
      </div>
    </div>
  );
}
