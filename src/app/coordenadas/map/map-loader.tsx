"use client";

import dynamic from "next/dynamic";

import { Spinner } from "@/components/spinner";

import type { Coordinate } from "../types";

// Leaflet acessa `window`/`document` no import, então precisa ser carregado
// só no client (ssr: false) — primeiro uso de next/dynamic neste projeto.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl border bg-muted/20">
      <Spinner className="size-6" />
    </div>
  ),
});

interface MapLoaderProps {
  coordinate: Coordinate | null;
  onSelect: (coord: Coordinate) => void;
}

export function MapLoader({ coordinate, onSelect }: MapLoaderProps) {
  return <LeafletMap coordinate={coordinate} onSelect={onSelect} />;
}
