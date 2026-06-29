import { useState, useEffect, useCallback, useRef } from "react";

declare global {
  interface Window {
    DeviceOrientationEvent: typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
  }
}

interface DeviceOrientation {
  alpha: number | null; // Rotação em torno do eixo Z (bússola)
  beta: number | null; // Inclinação em torno do eixo X (frente/trás)
  gamma: number | null; // Inclinação em torno do eixo Y (esquerda/direita)
}

interface UseDeviceOrientationResult {
  orientation: DeviceOrientation | null;
  isSupported: boolean;
  isStarted: boolean;
  hasPermission: boolean;
  error: Error | null;
  requestAccess: () => Promise<void>;
}

export function useDeviceOrientation(): UseDeviceOrientationResult {
  const [orientation, setOrientation] = useState<DeviceOrientation | null>(
    null
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Usamos useRef para o status da permissão para evitar dependências cíclicas em useEffect
  const permissionStatusRef = useRef<boolean>(false);

  // Callback para solicitar permissão, memoizado para evitar recriações
  const requestAccess = useCallback(async () => {
    setError(null); // Limpa erros anteriores ao tentar solicitar novamente

    if (typeof window === "undefined") {
      setError(
        new Error("Window object not available (client-side context needed).")
      );
      return;
    }

    // Verifica se a API DeviceOrientationEvent e requestPermission existem
    if (
      typeof window.DeviceOrientationEvent !== "undefined" &&
      typeof window.DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permissionState =
          await window.DeviceOrientationEvent.requestPermission();
        if (permissionState === "granted") {
          setHasPermission(true);
          permissionStatusRef.current = true;
        } else {
          setHasPermission(false);
          permissionStatusRef.current = false;
          setError(
            new Error("Permission to access device orientation denied.")
          );
        }
      } catch (err) {
        setHasPermission(false);
        permissionStatusRef.current = false;
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } else {
      // Para navegadores que não precisam de permissão explícita ou não suportam requestPermission
      setHasPermission(true); // Assumimos que a permissão é implícita ou não necessária
      permissionStatusRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Chrome 74+ hides DeviceOrientationEvent on non-secure origins (non-HTTPS,
    // non-localhost), making it appear unsupported when it's really a protocol issue.
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecure) {
      setIsSupported(false);
      setError(new Error("HTTPS required"));
      return;
    }

    if (typeof window.DeviceOrientationEvent !== "undefined") {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError(new Error("Device Orientation API not supported."));
      return;
    }

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      // Browsers without a real sensor (e.g. desktop Chrome) fire the event with
      // all-null values. Ignore those to avoid a false "level at 0,0" reading.
      if (event.beta === null && event.gamma === null) return;
      setOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
      });
      setIsStarted(true);
      setError(null);
    };

    if (!hasPermission && !error) {
      requestAccess();
    }

    if (hasPermission) {
      window.addEventListener("deviceorientation", handleDeviceOrientation);
    }

    return () => {
      if (hasPermission) {
        window.removeEventListener(
          "deviceorientation",
          handleDeviceOrientation
        );
        setIsStarted(false);
      }
    };
  }, [isSupported, hasPermission, error, requestAccess]);

  return {
    orientation,
    isSupported,
    isStarted,
    hasPermission,
    error,
    requestAccess,
  };
}
