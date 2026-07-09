"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import L from "leaflet";
import { useTheme } from "next-themes";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { cn } from "@/lib/utils";

import type { Coordinate } from "../types";

// Usa as CSS vars do tema (não hex fixo) para o marcador acompanhar o
// dark mode automaticamente — o navegador resolve `var(--destructive)`
// em tempo de paint, sem precisar recriar o ícone ao trocar de tema.
const markerIcon = L.divIcon({
  className: "coordenadas-marker",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="hsl(var(--destructive))" stroke="hsl(var(--background))" stroke-width="1.5"><path d="M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5" fill="hsl(var(--background))" stroke="none"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Centro aproximado do Brasil, usado antes de qualquer coordenada ser selecionada.
const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;
const SELECTED_ZOOM = 15;

function ClickHandler({ onSelect }: { onSelect: (coord: Coordinate) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RecenterOnChange({ coordinate }: { coordinate: Coordinate | null }) {
  const map = useMap();

  useEffect(() => {
    if (coordinate) map.setView([coordinate.lat, coordinate.lng], Math.max(map.getZoom(), SELECTED_ZOOM));
  }, [coordinate, map]);

  return null;
}

interface LeafletMapProps {
  coordinate: Coordinate | null;
  onSelect: (coord: Coordinate) => void;
}

export default function LeafletMap({ coordinate, onSelect }: LeafletMapProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div
      className={cn(
        "h-[400px] w-full overflow-hidden rounded-2xl border",
        resolvedTheme === "dark" && "coordenadas-map-dark",
      )}
    >
      <MapContainer
        center={coordinate ? [coordinate.lat, coordinate.lng] : DEFAULT_CENTER}
        zoom={coordinate ? SELECTED_ZOOM : DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onSelect={onSelect} />
        <RecenterOnChange coordinate={coordinate} />
        {coordinate && <Marker position={[coordinate.lat, coordinate.lng]} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}
