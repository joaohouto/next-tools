"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GyroNorm } from "gyronorm";

interface BubbleLevelDisplayProps {
  axis: "x" | "y" | "both";
  description?: string;
}

export function BubbleLevelDisplay({
  axis,
  description,
}: BubbleLevelDisplayProps) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [hasDeviceMotion, setHasDeviceMotion] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let gnInstance = null;

    const initGyroNorm = async () => {
      gnInstance = new GyroNorm();

      // Configure o GyroNorm
      gnInstance
        .init({
          gravityNormalized: true, // Retorna os ângulos de orientação normalizados
        })
        .then(() => {
          gnInstance?.start((data: gn.Data) => {
            // 'data' contém beta e gamma normalizados entre -180 e 180
            const { do: deviceOrientation } = data;
            const { beta, gamma } = deviceOrientation;

            if (beta !== null && gamma !== null) {
              // Os valores do gyronorm já são em graus e normalizados,
              // então aplicamos diretamente e invertemos para a bolha
              const newX = gamma * -1;
              const newY = beta * -1;

              if (axis === "x") {
                setX(newX);
                setY(0);
              } else if (axis === "y") {
                setX(0);
                setY(newY);
              } else {
                setX(newX);
                setY(newY);
              }
              setHasDeviceMotion(true);
              setPermissionDenied(false);
            }
          });
        })
        .catch((e) => {
          console.error("GyroNorm initialization error:", e);
          if (e.message.includes("Permission")) {
            setPermissionDenied(true);
          } else {
            setHasDeviceMotion(false); // API não suportada ou outro erro
          }
        });
    };

    initGyroNorm();

    return () => {
      if (gnInstance) {
        gnInstance.stop();
      }
    };
  }, [axis]);

  const bubbleTransformX = axis === "y" ? 0 : x / 2;
  const bubbleTransformY = axis === "x" ? 0 : y / 2;

  const showXGuide = axis === "x" || axis === "both";
  const showYGuide = axis === "y" || axis === "both";

  return (
    <Card className="w-full md:w-[320px] h-[320px] flex flex-col mx-auto shadow-lg rounded-2xl">
      <CardContent className="relative flex flex-grow items-center justify-center rounded-lg overflow-hidden p-0">
        {!hasDeviceMotion && permissionDenied && (
          <p className="text-center text-sm text-balance text-muted-foreground p-4">
            Permissão para acessar os sensores de movimento negada.
            <br />
            (Verifique as configurações do seu navegador/OS para permitir o
            acesso.)
          </p>
        )}
        {!hasDeviceMotion && !permissionDenied && (
          <p className="text-center text-xs text-balance text-muted-foreground p-4">
            Iniciando GyroNorm...
            <br />
            (Aguardando permissão ou API não suportada.)
          </p>
        )}
        {hasDeviceMotion && (
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
                  <div className="absolute size-24 border-[1px] border-foreground/40 rounded-full"></div>
                  <div className="absolute size-36 border-[1px] border-foreground/40 rounded-full"></div>
                </>
              )}
              {axis !== "both" && (
                <>
                  {/* Shorter lines inside the circle for non-both modes */}
                  {showXGuide && (
                    <>
                      <div className="absolute w-24 h-[1px] bg-foreground/40 top-1/2 -translate-y-1/2"></div>
                      <div className="absolute w-[1px] h-24 bg-foreground/40 left-1/2 -translate-x-1/2"></div>
                    </>
                  )}
                  {showYGuide && (
                    <>
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
