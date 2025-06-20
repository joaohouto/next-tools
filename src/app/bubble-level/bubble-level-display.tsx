"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceOrientation } from "@/lib/use-device-orientation";

interface BubbleLevelDisplayProps {
  axis: "x" | "y" | "both";
  description?: string;
}

export function BubbleLevelDisplay({
  axis,
  description,
}: BubbleLevelDisplayProps) {
  const { orientation, isSupported, isStarted, hasPermission, error } =
    useDeviceOrientation();

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    if (orientation) {
      // Os valores de beta e gamma vêm diretamente do DeviceOrientationEvent
      // O beta é a inclinação de frente/trás (pitch)
      // O gamma é a inclinação de lado/lado (roll)
      const { beta, gamma } = orientation;

      // Invertemos os valores para que a bolha se mova intuitivamente
      // (ex: inclinar para a direita move a bolha para a direita)
      const newX = gamma !== null ? gamma * -1 : 0;
      const newY = beta !== null ? beta * -1 : 0;

      if (axis === "x") {
        setX(newX);
        setY(0); // Trava o Y para nível horizontal
      } else if (axis === "y") {
        setX(0); // Trava o X para nível vertical
        setY(newY);
      } else {
        setX(newX);
        setY(newY);
      }
    }
  }, [orientation, axis]); // Reage a mudanças na orientação ou no eixo

  const bubbleTransformX = axis === "y" ? 0 : x / 2;
  const bubbleTransformY = axis === "x" ? 0 : y / 2;

  const showXGuide = axis === "x" || axis === "both";
  const showYGuide = axis === "y" || axis === "both";

  const showPermissionDenied = error && error.message.includes("Permission");
  const showNotSupported = !isSupported && !error;
  const showAwaitingData = isSupported && !isStarted && hasPermission && !error;
  const showAwaitingPermission =
    isSupported && !isStarted && !hasPermission && !error;

  return (
    <Card className="w-full md:w-[320px] h-[320px] flex flex-col mx-auto shadow-lg rounded-2xl">
      <CardContent className="relative flex flex-grow items-center justify-center rounded-lg overflow-hidden p-0">
        {showPermissionDenied && (
          <p className="text-center text-sm text-balance text-muted-foreground p-4">
            Permissão para acessar os sensores de movimento negada.
            <br />
            (Verifique as configurações do seu navegador/OS para permitir o
            acesso.)
          </p>
        )}
        {showNotSupported && (
          <p className="text-center text-sm text-balance text-muted-foreground p-4">
            A API de Orientação de Dispositivo não é suportada neste navegador.
          </p>
        )}
        {showAwaitingPermission && (
          <p className="text-center text-xs text-balance text-muted-foreground p-4">
            Aguardando permissão para acessar os sensores de movimento...
            <br />
            (Pode ser necessário interagir com a página para solicitar.)
          </p>
        )}
        {showAwaitingData && (
          <p className="text-center text-xs text-balance text-muted-foreground p-4">
            Permissão concedida. Aguardando dados do sensor...
            <br />
            (Mova seu dispositivo.)
          </p>
        )}

        {/* Só renderiza o nível se o sensor estiver ativo e tiver permissão */}
        {isStarted && hasPermission && orientation && (
          <>
            {/* Guide Lines - Main Cross */}
            {showXGuide && (
              <div className="absolute w-full h-[1px] bg-foreground/50 top-1/2 -translate-y-1/2"></div>
            )}
            {showYGuide && (
              <div className="absolute h-full w-[1px] bg-foreground/50 left-1/2 -translate-x-1/2"></div>
            )}

            {/* Guide Lines - Quadrants */}
            {showXGuide && (
              <>
                <div className="absolute w-full h-[1px] bg-foreground/30 top-[25%] -translate-y-1/2"></div>
                <div className="absolute w-full h-[1px] bg-foreground/30 top-[75%] -translate-y-1/2"></div>
              </>
            )}
            {showYGuide && (
              <>
                <div className="absolute h-full w-[1px] bg-foreground/30 left-[25%] -translate-x-1/2"></div>
                <div className="absolute h-full w-[1px] bg-foreground/30 left-[75%] -translate-x-1/2"></div>
              </>
            )}

            {/* Central Circle */}
            <div className="absolute w-48 h-48 border-[1px] border-foreground/50 rounded-full flex items-center justify-center">
              {/* Inner Circles/Guides for finer precision */}
              {axis === "both" && (
                <>
                  <div className="absolute size-12 border-[1px] border-foreground/40 rounded-full"></div>
                </>
              )}
              {axis !== "both" && (
                <>
                  {/* Shorter lines inside the circle for non-both modes */}
                  {showXGuide && (
                    <>
                      <div className="absolute size-12 border-[1px] border-foreground/40 rounded-full"></div>
                      <div className="absolute w-48  h-12 border-[1px] border-foreground/40 rounded-full"></div>

                      <div className="absolute w-24 h-[1px] bg-foreground/40 top-1/2 -translate-y-1/2"></div>
                      <div className="absolute w-[1px] h-24 bg-foreground/40 left-1/2 -translate-x-1/2"></div>
                    </>
                  )}
                  {showYGuide && (
                    <>
                      <div className="absolute size-12 border-[1px] border-foreground/40 rounded-full"></div>
                      <div className="absolute w-12  h-48 border-[1px] border-foreground/40 rounded-full"></div>

                      <div className="absolute w-24 h-[1px] bg-foreground/40 top-1/2 -translate-y-1/2 rotate-90"></div>
                      <div className="absolute w-[1px] h-24 bg-foreground/40 left-1/2 -translate-x-1/2 rotate-90"></div>
                    </>
                  )}
                </>
              )}

              {/* Central dot */}
              <div className="w-1.5 h-1.5 bg-foreground rounded-full z-10"></div>

              {/* Bubble */}
              <div
                className="absolute w-12 h-12 bg-blue-500 rounded-full opacity-75 shadow-md transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${bubbleTransformX}px, ${bubbleTransformY}px)`,
                  left: "calc(50% - 24px)",
                  top: "calc(50% - 24px)",
                }}
              ></div>
            </div>
            <div className="absolute bottom-2 text-xs text-foreground px-2 text-center">
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
              <p>
                X: {x.toFixed(1)}° Y: {y.toFixed(1)}°
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
