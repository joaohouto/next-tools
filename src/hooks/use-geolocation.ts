import { useCallback, useState } from "react";

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  timestamp: number;
}

interface UseGeolocationResult {
  position: GeoPosition | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  requestAccess: () => Promise<void>;
}

function describeGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão de localização negada.";
    case error.POSITION_UNAVAILABLE:
      return "Localização indisponível no momento.";
    case error.TIMEOUT:
      return "Tempo esgotado ao tentar obter a localização.";
    default:
      return "Não foi possível obter a localização.";
  }
}

/**
 * Diferente de use-device-orientation.ts, não solicitamos permissão
 * automaticamente no mount: o popup de permissão do navegador só deve
 * aparecer após uma ação explícita do usuário (requestAccess).
 */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  const requestAccess = useCallback(async () => {
    if (!isSupported) {
      setError("Geolocalização não é suportada neste navegador.");
      return;
    }

    setIsLoading(true);
    setError(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            timestamp: pos.timestamp,
          });
          setIsLoading(false);
          resolve();
        },
        (err) => {
          setError(describeGeolocationError(err));
          setIsLoading(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }, [isSupported]);

  return { position, isSupported, isLoading, error, requestAccess };
}
