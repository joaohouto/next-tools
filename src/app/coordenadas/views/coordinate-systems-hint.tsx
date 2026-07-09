"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SYSTEMS = [
  {
    name: "Decimal (DD)",
    subtitle: "Graus decimais",
    example: "-23.550520, -46.633308",
    description:
      "O formato mais simples e o mais usado hoje em dia — é o que aparece em GPS, smartphones e serviços como Google Maps e Waze. Latitude e longitude viram um único número decimal: positivo é Norte/Leste, negativo é Sul/Oeste.",
    details: [
      "Latitude varia de -90 a 90 (Polo Sul a Polo Norte).",
      "Longitude varia de -180 a 180 (a partir do meridiano de Greenwich).",
      "Fácil de digitar, comparar e usar direto em cálculos e fórmulas (como distância entre pontos).",
    ],
  },
  {
    name: "Graus, minutos e segundos (DMS)",
    subtitle: "Sistema sexagesimal tradicional",
    example: `23°33'01.9"S 46°37'59.9"W`,
    description:
      "O formato clássico de navegação e cartografia, usado há séculos. Cada grau se divide em 60 minutos, e cada minuto em 60 segundos — como as horas de um relógio. Em vez de sinal negativo, usa uma letra de direção (N/S para latitude, E/W para longitude).",
    details: [
      "Mais preciso visualmente para leitura em cartas náuticas e aeronáuticas.",
      "N e E equivalem a valores positivos em decimal; S e W equivalem a negativos.",
      "Ainda é o padrão em muitos documentos oficiais e roteiros de navegação marítima.",
    ],
  },
  {
    name: "UTM",
    subtitle: "Universal Transverse Mercator",
    example: "23K 456789E 7345678N",
    description:
      "Um sistema de projeção cartográfica (não usa graus) que divide a Terra em 60 zonas de 6° de longitude cada. Dentro de cada zona, a posição é dada em metros a partir de um ponto de referência — o que torna cálculos de distância e área muito mais diretos do que com graus.",
    details: [
      "Zona (1-60) + banda de latitude (letra) identificam a região da Terra, ex: \"23K\".",
      "Easting: distância em metros a leste da referência da zona (linha central + 500.000 m).",
      "Northing: distância em metros ao norte do Equador (ou, no hemisfério sul, com um deslocamento de 10.000.000 m).",
      "Muito usado em agrimensura, engenharia civil e mapas topográficos oficiais (como os do IBGE).",
    ],
  },
];

export function CoordinateSystemsHint() {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground transition-transform active:scale-95"
            >
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>O que são esses formatos?</TooltipContent>
      </Tooltip>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sistemas de coordenadas</DialogTitle>
          <DialogDescription>
            Entenda as diferenças entre os três formatos usados nesta ferramenta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {SYSTEMS.map((system, i) => (
            <div key={system.name} className="flex flex-col gap-2">
              {i > 0 && <Separator className="mb-3" />}
              <div>
                <h3 className="font-semibold leading-none">{system.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {system.subtitle}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{system.description}</p>
              <ul className="list-disc pl-4 text-sm text-muted-foreground">
                {system.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p className="font-mono text-xs tabular-nums text-foreground">
                Exemplo: {system.example}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
