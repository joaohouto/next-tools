"use client";

import type { Coordinate } from "../types";
import { ConverterView } from "./converter-view";
import { MapView } from "./map-view";

interface LocationViewProps {
  coordinate: Coordinate | null;
  onChange: (coord: Coordinate) => void;
}

export function LocationView({ coordinate, onChange }: LocationViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <MapView coordinate={coordinate} onChange={onChange} />
      <ConverterView coordinate={coordinate} onChange={onChange} />
    </div>
  );
}
