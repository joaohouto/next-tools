"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Printer,
  Type,
  Settings2,
  FileText,
  BookOpen,
  RotateCcw,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
interface Preset {
  label: string;
  description: string;
  badge?: string;
  fontSizeMm: number;
  lineHeightMm: number;
  showLines: boolean;
  showBaseline: boolean;
}

interface Template {
  title: string;
  content: string;
}

interface Font {
  name: string;
  label: string;
  type: string;
}

// ---------------------------------------------------------------------------
// DADOS
// ---------------------------------------------------------------------------

/**
 * Presets baseados em medições reais de papéis padronizados brasileiros.
 *
 * Metodologia:
 *  - Caderno pauta larga (Escolar/EF I):  pautas de ~9 mm
 *  - Caderno pauta universitária (EF II +): pautas de ~7 mm
 *  - ENEM / vestibulares (INEP):           espaço de escrita ~8 mm entre linhas
 *  - OAB (FGV):                            espaço de escrita ~8 mm entre linhas
 *  - Caligrafia iniciante:                 mínimo 12 mm recomendado por instrutores
 *
 * O tamanho da fonte é calibrado para que a altura x (x-height) da letra
 * fique ~55-65 % do espaçamento de linhas, que é a proporção tipográfica padrão.
 */
const PRESETS: Preset[] = [
  {
    label: "Caligrafia Iniciante",
    description: "Letras grandes para treino de movimentos básicos",
    badge: "Iniciante",
    fontSizeMm: 10,
    lineHeightMm: 16,
    showLines: true,
    showBaseline: true,
  },
  {
    label: "Caderno Escolar",
    description: "Pauta larga usada no Ensino Fundamental I (~9 mm)",
    badge: "EF I",
    fontSizeMm: 7,
    lineHeightMm: 9,
    showLines: true,
    showBaseline: false,
  },
  {
    label: "Caderno Universitário",
    description: "Pauta estreita padrão (~7 mm)",
    badge: "EF II +",
    fontSizeMm: 5.5,
    lineHeightMm: 7,
    showLines: true,
    showBaseline: false,
  },
  {
    label: "ENEM / Vestibular",
    description: "Folha de resposta INEP (~8 mm entre linhas)",
    badge: "ENEM",
    fontSizeMm: 6,
    lineHeightMm: 8,
    showLines: true,
    showBaseline: false,
  },
  {
    label: "OAB / Concursos",
    description: "Caderno de prova FGV/CESPE (~8 mm)",
    badge: "OAB",
    fontSizeMm: 6,
    lineHeightMm: 8,
    showLines: true,
    showBaseline: false,
  },
];

const TEMPLATES: Template[] = [
  {
    title: "Alfabeto",
    content:
      "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\na b c d e f g h i j k l m n o p q r s t u v w x y z\n0 1 2 3 4 5 6 7 8 9",
  },
  {
    title: "Pangrama 1",
    content:
      "A rápida raposa marrom pula sobre o cão preguiçoso.\n\nZebras caóticas vivem num zoológico de pequenos felinos selvagens.",
  },
  {
    title: "Pangrama 2 (Acentos)",
    content:
      'À noite, vovô Kowalsky vê o ímã cair no pé do pinguim queixoso e vovó põe açúcar no chá de tâmaras do jabuti feliz.\n\nLuís arguia à Júlia que "brações, fões, halteres, mimos, quatis e zepelins" eram palavras do português.',
  },
  {
    title: "Linhas em branco",
    content: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
  },
];

// ---------------------------------------------------------------------------
// Bug fix: replaceAll para fontes com múltiplas palavras no nome
// ---------------------------------------------------------------------------
const FONTS: Font[] = [
  { name: "Parisienne", label: "Parisienne", type: "cursive" },
  { name: "Italianno", label: "Italianno", type: "cursive" },
  { name: "Caveat", label: "Caveat", type: "cursive" },
  { name: "Dancing Script", label: "Dancing Script", type: "cursive" },
  { name: "Great Vibes", label: "Great Vibes", type: "cursive" },
  { name: "Alex Brush", label: "Alex Brush", type: "cursive" },
  { name: "Pacifico", label: "Pacifico", type: "cursive" },
  { name: "Kalam", label: "Kalam (manuscrito)", type: "cursive" },
  { name: "Patrick Hand", label: "Patrick Hand", type: "cursive" },
  { name: "Edu SA Beginner", label: "Edu SA (escolar)", type: "cursive" },
  { name: "Source Serif 4", label: "Source Serif (serifada)", type: "serif" },
];

// Corrige bug: substitui TODOS os espaços por "+"
const buildFontImportUrl = (fonts: Font[]) => {
  const families = fonts
    .map((f) => `family=${f.name.replace(/\s+/g, "+")}:wght@400;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------
export default function CalligraphyStudio() {
  const [text, setText] = useState<string>(TEMPLATES[0].content);
  const [fontFamily, setFontFamily] = useState<string>("Parisienne");
  const [fontSizeMm, setFontSizeMm] = useState<number[]>([7]);
  const [lineHeightMm, setLineHeightMm] = useState<number[]>([9]);
  const [textOpacity, setTextOpacity] = useState<number[]>([30]);
  const [showLines, setShowLines] = useState<boolean>(true);
  const [showBaseline, setShowBaseline] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<number | null>(1); // Caderno Escolar

  const printRef = useRef<HTMLDivElement>(null);

  const applyPreset = (preset: Preset, index: number) => {
    setFontSizeMm([preset.fontSizeMm]);
    setLineHeightMm([preset.lineHeightMm]);
    setShowLines(preset.showLines);
    setShowBaseline(preset.showBaseline);
    setActivePreset(index);
  };

  const handlePrint = () => {
    window.print();
    toast.success("Pronto! Salve como PDF na tela de impressão.");
  };

  // Proporção recomendada: linha de baseline a ~70% do espaçamento
  // (onde a base da maioria das letras minúsculas fica)
  const baselineOffset = Math.round(lineHeightMm[0] * 0.72 * 10) / 10;

  return (
    <TooltipProvider>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @import url('${buildFontImportUrl(FONTS)}');

          /* ---- Papel pautado ---- */
          /*
           * CORREÇÃO TÉCNICA:
           * Cada "célula" de linha tem altura exata = lineHeightMm.
           * A linha cinza (1px real ≈ 0.265mm) fica no FINAL da célula,
           * ou seja, na posição (lineHeightMm - 0.265mm) dentro de cada repetição.
           * Isso coloca a linha de pauta ABAIXO do texto, como em cadernos reais.
           *
           * A linha de baseline (azul clara, opcional) marca onde a base das
           * letras minúsculas deve pousar — ~72% da altura da linha.
           */
          .lined-paper {
            background-image: repeating-linear-gradient(
              to bottom,
              transparent 0,
              transparent calc(var(--lh) - 0.8px),
              #c8d6e5 calc(var(--lh) - 0.8px),
              #c8d6e5 var(--lh)
            );
          }

          .lined-paper.with-baseline {
            background-image: repeating-linear-gradient(
              to bottom,
              transparent 0,
              transparent calc(var(--baseline) - 0.5px),
              #bfdbfe calc(var(--baseline) - 0.5px),
              #bfdbfe var(--baseline),
              transparent var(--baseline),
              transparent calc(var(--lh) - 0.8px),
              #c8d6e5 calc(var(--lh) - 0.8px),
              #c8d6e5 var(--lh)
            );
          }

          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              box-shadow: none !important;
              border: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 15mm 18mm;
            }
          }
        `,
        }}
      />

      <div className="min-h-screen p-6 bg-neutral-100 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title="Estúdio de Caligrafia"
            description="Folhas de treino com medidas calibradas para impressão A4."
            icon={<Type className="w-5 h-5" />}
            actions={
              <Button onClick={handlePrint} size="sm" className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF
              </Button>
            }
          />

          <div className="grid lg:grid-cols-12 gap-6 print:block">
            {/* ============================================================
                PAINEL DE CONTROLE
            ============================================================ */}
            <div className="lg:col-span-4 space-y-4 print:hidden">
              {/* CONTEÚDO */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Conteúdo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((tpl, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setText(tpl.content)}
                      >
                        {tpl.title}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-muted-foreground"
                      onClick={() => setText("")}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Limpar
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Digite o texto para praticar ou escolha um modelo acima..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[160px] resize-none text-sm font-mono"
                  />
                </CardContent>
              </Card>

              {/* PRESETS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Padrões de Pauta
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Medidas calibradas com base em pautas reais de cadernos
                        e folhas de prova do ENEM/OAB. Aplique e depois ajuste
                        fino se necessário.
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => applyPreset(preset, i)}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all hover:border-primary/60 hover:bg-primary/5 ${
                        activePreset === i
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span>{preset.label}</span>
                        {preset.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {preset.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-normal">
                        {preset.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                        {preset.fontSizeMm}mm fonte · {preset.lineHeightMm}mm
                        pauta
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* AJUSTE FINO */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Ajuste Fino
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Fonte */}
                  <div className="space-y-2">
                    <Label className="text-sm">Estilo de Letra</Label>
                    <Select
                      value={fontFamily}
                      onValueChange={(v) => {
                        setFontFamily(v);
                        setActivePreset(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONTS.map((font) => (
                          <SelectItem key={font.name} value={font.name}>
                            <span style={{ fontFamily: font.name }}>
                              {font.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tamanho da letra */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Tamanho da Letra</Label>
                      <span className="text-sm font-mono font-medium text-primary tabular-nums">
                        {fontSizeMm[0].toFixed(1)} mm
                      </span>
                    </div>
                    <Slider
                      value={fontSizeMm}
                      onValueChange={(v) => {
                        setFontSizeMm(v);
                        setActivePreset(null);
                      }}
                      min={3}
                      max={30}
                      step={0.5}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Altura real da letra no papel A4 impresso.
                    </p>
                  </div>

                  {/* Espaçamento de linhas */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Espaçamento de Pauta</Label>
                      <span className="text-sm font-mono font-medium text-primary tabular-nums">
                        {lineHeightMm[0].toFixed(1)} mm
                      </span>
                    </div>
                    <Slider
                      value={lineHeightMm}
                      onValueChange={(v) => {
                        setLineHeightMm(v);
                        setActivePreset(null);
                      }}
                      min={5}
                      max={40}
                      step={0.5}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Distância de linha a linha (como em cadernos). Proporção
                      ideal: fonte ≈ 65–75% do espaçamento.{" "}
                      <span className="text-primary font-medium">
                        ({((fontSizeMm[0] / lineHeightMm[0]) * 100).toFixed(0)}%
                        atual)
                      </span>
                    </p>
                  </div>

                  {/* Opacidade */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">
                        Intensidade do Pontilhado
                      </Label>
                      <span className="text-sm font-mono font-medium text-primary tabular-nums">
                        {textOpacity[0]}%
                      </span>
                    </div>
                    <Slider
                      value={textOpacity}
                      onValueChange={setTextOpacity}
                      min={5}
                      max={100}
                      step={5}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      20–35% → tracejado para cobrir. 100% → modelo para copiar.
                    </p>
                  </div>

                  <Separator />

                  {/* Switches */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Linhas de Pauta</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Linhas horizontais guias
                        </p>
                      </div>
                      <Switch
                        checked={showLines}
                        onCheckedChange={(v) => {
                          setShowLines(v);
                          setActivePreset(null);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Linha de Baseline</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Linha azul onde a letra repousa
                        </p>
                      </div>
                      <Switch
                        checked={showBaseline}
                        onCheckedChange={(v) => {
                          setShowBaseline(v);
                          setActivePreset(null);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================================
                ÁREA DE PRÉVIA / IMPRESSÃO
            ============================================================ */}
            <div className="lg:col-span-8">
              <Card
                id="print-area"
                ref={printRef}
                className="bg-white text-black shadow-lg border-slate-200 overflow-hidden"
                style={
                  {
                    /*
                     * CSS Custom Properties em mm (suportado nativamente pelo browser).
                     * --lh  = espaçamento total de pauta
                     * --baseline = posição da linha de base dentro da pauta
                     */
                    "--lh": `${lineHeightMm[0]}mm`,
                    "--baseline": `${baselineOffset}mm`,
                    minHeight: "297mm",
                    width: "100%",
                  } as React.CSSProperties
                }
              >
                <CardContent className="p-[15mm] h-full">
                  {/* Indicador de proporção (apenas preview) */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex-1 text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="inline-block w-3 border-b border-slate-300" />
                      pauta: {lineHeightMm[0]}mm
                    </div>
                    <div className="text-[10px] text-slate-400">
                      fonte: {fontSizeMm[0]}mm
                    </div>
                    {showBaseline && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-400">
                        <span className="inline-block w-3 border-b border-blue-300" />
                        baseline: {baselineOffset}mm
                      </div>
                    )}
                  </div>

                  {/*
                   * CORREÇÃO: o elemento .lined-paper usa background-size em mm,
                   * sincronizado com o line-height do texto via a mesma variável CSS.
                   * Isso garante que cada linha de texto fique exatamente dentro
                   * de uma célula de pauta.
                   */}
                  <div
                    className={[
                      "w-full h-full whitespace-pre-wrap break-words",
                      showLines ? "lined-paper" : "",
                      showLines && showBaseline ? "with-baseline" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      fontFamily: `'${fontFamily}', cursive, sans-serif`,
                      fontSize: `${fontSizeMm[0]}mm`,
                      /*
                       * CORREÇÃO CRÍTICA DE ALINHAMENTO:
                       * line-height DEVE usar a mesma unidade mm que o background-size
                       * da pauta para o texto e as linhas ficarem em sincronia.
                       * Usar `normal` ou `em` causaria desalinhamento progressivo.
                       */
                      lineHeight: `${lineHeightMm[0]}mm`,
                      color: `rgba(0, 0, 0, ${textOpacity[0] / 100})`,
                      /*
                       * background-size em mm = tamanho exato de uma célula de pauta.
                       * Sem isso, o repeating-linear-gradient usa unidades de px
                       * e perde sincronia com o line-height em mm.
                       */
                      backgroundSize: `100% ${lineHeightMm[0]}mm`,
                    }}
                  >
                    {text || "Digite algo para começar..."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
