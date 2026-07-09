"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { Coordinate } from "../types";

// Leaflet acessa `window`/`document` no import, então precisa ser carregado
// só no client (ssr: false) — primeiro uso de next/dynamic neste projeto.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-2xl" />,
});

interface MapLoaderProps {
  coordinate: Coordinate | null;
  onSelect: (coord: Coordinate) => void;
}

export function MapLoader({ coordinate, onSelect }: MapLoaderProps) {
  return <LeafletMap coordinate={coordinate} onSelect={onSelect} />;
}
