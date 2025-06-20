"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import useGyroscope from "react-hook-gyroscope";

interface BubbleLevelDisplayProps {
  axis: "x" | "y" | "both";
  description?: string;
}

export function BubbleLevelDisplay({
  axis,
  description,
}: BubbleLevelDisplayProps) {
  // Use o hook useGyroscope para obter os dados do giroscópio e status
  const {
    orientation, // Contém beta, gamma, alpha, etc.
    isSupported, // Indica se a API Device Orientation é suportada
    isStarted, // Indica se a leitura do sensor foi iniciada
    requestAccess, // Função para solicitar permissão (especialmente para iOS 13+)
    hasPermission, // True se a permissão foi concedida ou não é necessária
    error, // Qualquer erro que possa ocorrer (ex: permissão negada)
  } = useGyroscope();

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    // Tenta solicitar acesso automaticamente quando o componente monta
    // E apenas se for suportado e a permissão ainda não foi dada
    if (isSupported && !hasPermission && !error) {
      requestAccess();
    }
  }, [isSupported, hasPermission, error, requestAccess]); // Dependências do useEffect

  useEffect(() => {
    if (orientation) {
      const { beta, gamma } = orientation;

      // Os valores de orientation já vêm do gyronorm (normalizados, em graus)
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
    }
  }, [orientation, axis]); // Reage a mudanças na orientação ou no eixo

  const bubbleTransformX = axis === "y" ? 0 : x / 2;
  const bubbleTransformY = axis === "x" ? 0 : y / 2;

  const showXGuide = axis === "x" || axis === "both";
  const showYGuide = axis === "y" || axis === "both";

  // Lógica para exibir mensagens de status
  const showPermissionDenied =
    !hasPermission && error && error.message.includes("Permission");
  const showNotSupported = !isSupported && !error;
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
            (Pode ser necessário interagir para solicitar.)
          </p>
        )}

        {/* Só renderiza o nível se o sensor estiver ativo e tiver permissão */}
        {isStarted && hasPermission && (
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
