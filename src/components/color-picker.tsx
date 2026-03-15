"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Paintbrush } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useMemo } from "react";

export function ColorPicker({
  color,
  setColor,
  className,
  showGradientTab = true,
}: {
  color: string;
  setColor: (color: string) => void;
  className?: string;
  showGradientTab?: boolean;
}) {
  const solids = [
    // Neutros
    "#FFFFFF", // Branco
    "#F8F9FA", // Cinza muito claro
    "#E9ECEF", // Cinza claro
    "#DEE2E6", // Cinza médio
    "#ADB5BD", // Cinza escuro
    "#6C757D", // Cinza chumbo
    "#495057", // Cinza carvão
    "#343A40", // Cinza profundo
    "#212529", // Preto suave
    "#000000", // Preto

    // Vermelhos
    "#FF6B6B", // Vermelho claro
    "#FF0000", // Vermelho puro
    "#C92A2A", // Vermelho escuro

    // Laranjas
    "#FFA647", // Laranja vibrante
    "#FD7E14", // Laranja queimado
    "#CC5803", // Laranja escuro

    // Amarelos
    "#FFE83F", // Amarelo vivo
    "#FFC107", // Amarelo ouro
    "#E0A800", // Amarelo mostarda

    // Verdes
    "#9FFF5B", // Verde limão
    "#28A745", // Verde padrão
    "#218838", // Verde escuro

    // Azuis
    "#70E2FF", // Azul neon
    "#007BFF", // Azul vibrante
    "#0056B3", // Azul profundo

    // Roxos
    "#CD93FF", // Roxo pastel
    "#6F42C1", // Roxo intenso
    "#4C2882", // Roxo escuro

    // Extras
    "#09203F", // Azul noite
    "#FAE1DD", // Bege claro
    "#D8BFD8", // Lavanda
    "#FFE4B5", // Marfim
    "transparent", // Transparente
  ];

  const gradients = [
    // Tons suaves
    "linear-gradient(to top left,#accbee,#e7f0fd)",
    "linear-gradient(to top left,#d5d4d0,#d5d4d0,#eeeeec)",
    "linear-gradient(to top left,#fdfbfb,#ebedee)",
    "linear-gradient(to top left,#ffecd2,#fcb69f)",
    "linear-gradient(to top left,#a1c4fd,#c2e9fb)",
    "linear-gradient(to top left,#fddb92,#d1fdff)",
    "linear-gradient(to top left,#e0c3fc,#8ec5fc)",
    "linear-gradient(to top left,#f5f7fa,#c3cfe2)",
    // Escuros
    "linear-gradient(to top left,#000000,#434343)",
    "linear-gradient(to top left,#09203f,#537895)",
    "linear-gradient(to top left,#0f0c29,#302b63,#24243e)",
    "linear-gradient(to top left,#1a1a2e,#16213e,#0f3460)",
    "linear-gradient(to top left,#232526,#414345)",
    // Vibrantes
    "linear-gradient(to top left,#AC32E4,#7918F2,#4801FF)",
    "linear-gradient(to top left,#f953c6,#b91d73)",
    "linear-gradient(to top left,#ee0979,#ff6a00)",
    "linear-gradient(to top left,#F00000,#DC281E)",
    "linear-gradient(to top left,#00c6ff,#0072ff)",
    "linear-gradient(to top left,#4facfe,#00f2fe)",
    "linear-gradient(to top left,#0ba360,#3cba92)",
    "linear-gradient(to top left,#FDFC47,#24FE41)",
    "linear-gradient(to top left,#f7971e,#ffd200)",
    "linear-gradient(to top left,#56ab2f,#a8e063)",
    "linear-gradient(to top left,#614385,#516395)",
    "linear-gradient(to top left,#02aab0,#00cdac)",
    "linear-gradient(to top left,#d53369,#cbad6d)",
    // Multicoloridos
    "linear-gradient(to top left,#8a2be2,#0000cd,#228b22,#ccff00)",
    "linear-gradient(to top left,#40E0D0,#FF8C00,#FF0080)",
    "linear-gradient(to top left,#fcc5e4,#fda34b,#ff7882,#c8699e,#7046aa,#0c1db8,#020f75)",
    "linear-gradient(to top left,#ff75c3,#ffa647,#ffe83f,#9fff5b,#70e2ff,#cd93ff)",
    "linear-gradient(to right,#fc5c7d,#6a3093)",
    "linear-gradient(to right,#43cea2,#185a9d)",
    "linear-gradient(to right,#f7ff00,#db36a4)",
    "linear-gradient(to right,#11998e,#38ef7d)",
  ];

  const defaultTab = useMemo(() => {
    if (color.includes("url")) return "image";
    if (color.includes("gradient")) return "gradient";
    return "solid";
  }, [color]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal overflow-hidden",
            !color && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {color ? (
              <div
                className="h-4 w-4 rounded border !bg-center !bg-cover transition-all flex-shrink-0"
                style={{ background: color }}
              ></div>
            ) : (
              <Paintbrush className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate min-w-0">
              {color ? color : "Escolha uma cor"}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger className="flex-1" value="solid">
              Sólido
            </TabsTrigger>
            {showGradientTab !== false && (
              <TabsTrigger className="flex-1" value="gradient">
                Gradiente
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="solid" className="flex flex-wrap gap-1 mt-0">
            {solids.map((s) => (
              <div
                key={s}
                style={{ background: s }}
                className="rounded-md h-6 w-6 cursor-pointer active:scale-105 border"
                onClick={() => setColor(s)}
              />
            ))}
          </TabsContent>

          <TabsContent value="gradient" className="mt-0">
            <div className="flex flex-wrap gap-1 mb-2">
              {gradients.map((s) => (
                <div
                  key={s}
                  style={{ background: s }}
                  className="rounded-md h-6 w-6 cursor-pointer active:scale-105 border"
                  onClick={() => setColor(s)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="password">Change your password here.</TabsContent>
        </Tabs>

        <Input
          id="custom"
          value={color}
          className="col-span-2 h-8 mt-4"
          onChange={(e) => setColor(e.currentTarget.value)}
        />
      </PopoverContent>
    </Popover>
  );
}
