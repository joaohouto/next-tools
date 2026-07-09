"use client";

import { useEffect, useState } from "react";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";

import { MapLoader } from "../map/map-loader";
import { geocode, reverseGeocode } from "../nominatim";
import type { Coordinate, NominatimResult } from "../types";

interface MapViewProps {
  coordinate: Coordinate | null;
  onChange: (coord: Coordinate) => void;
}

export function MapView({ coordinate, onChange }: MapViewProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const debouncedQuery = useDebounce(query, 500);
  const geolocation = useGeolocation();

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    geocode(debouncedQuery, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setResults([]);
      })
      .finally(() => setIsSearching(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!coordinate) return;

    const controller = new AbortController();
    setIsResolvingAddress(true);
    setAddress(null);

    reverseGeocode(coordinate.lat, coordinate.lng, controller.signal)
      .then((result) => setAddress(result?.display_name ?? "Endereço não encontrado"))
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") setAddress("Endereço não encontrado");
      })
      .finally(() => setIsResolvingAddress(false));

    return () => controller.abort();
  }, [coordinate]);

  useEffect(() => {
    if (geolocation.position) {
      onChange({ lat: geolocation.position.latitude, lng: geolocation.position.longitude });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.position]);

  const selectResult = (result: NominatimResult) => {
    onChange({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setQuery(result.display_name);
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar endereço, cidade, ponto..."
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {results.length > 0 && (
            <Card className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto py-1">
              {results.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => selectResult(result)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{result.display_name}</span>
                </button>
              ))}
            </Card>
          )}
        </div>

        <Button
          variant="outline"
          onClick={geolocation.requestAccess}
          disabled={geolocation.isLoading}
          className="shrink-0"
        >
          {geolocation.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          Usar minha localização
        </Button>
      </div>

      {geolocation.error && <p className="text-sm text-destructive">{geolocation.error}</p>}

      <MapLoader coordinate={coordinate} onSelect={onChange} />

      {coordinate && (
        <p className="text-sm text-muted-foreground">
          {isResolvingAddress ? "Buscando endereço..." : address}
        </p>
      )}
    </div>
  );
}
