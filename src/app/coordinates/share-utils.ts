import { toast } from "sonner";

import { ddToDms, ddToUtm, formatDMS, formatUTM } from "./coordinate-utils";
import type { Coordinate } from "./types";

export type CoordinateFormat = "dd" | "dms" | "utm";

export function formatForCopy(coord: Coordinate, format: CoordinateFormat): string {
  switch (format) {
    case "dd":
      return `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`;
    case "dms":
      return formatDMS(ddToDms(coord));
    case "utm":
      return formatUTM(ddToUtm(coord));
  }
}

export async function copyCoordinate(coord: Coordinate, format: CoordinateFormat): Promise<void> {
  try {
    await navigator.clipboard.writeText(formatForCopy(coord, format));
    toast.success("Coordenadas copiadas!");
  } catch {
    toast.error("Não foi possível copiar as coordenadas.");
  }
}

export function googleMapsUrl(coord: Coordinate): string {
  return `https://www.google.com/maps?q=${coord.lat},${coord.lng}`;
}

export function osmUrl(coord: Coordinate): string {
  return `https://www.openstreetmap.org/?mlat=${coord.lat}&mlon=${coord.lng}#map=16/${coord.lat}/${coord.lng}`;
}

export function wazeUrl(coord: Coordinate): string {
  return `https://waze.com/ul?ll=${coord.lat},${coord.lng}&navigate=yes`;
}
