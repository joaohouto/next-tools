"use client";

import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrubbableNumberField } from "@/components/ui/scrubbable-number-field";
import { FontCombobox } from "./font-combobox";
import { AlertTriangle } from "lucide-react";
import { getFont } from "./fonts";
import { stepFor, toPx, fromPx, type Unit } from "./units";
import type { CircularTextConfig, TextAlign } from "./types";

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1">
      {title}
    </p>
  );
}

const ANCHOR_PRESETS: { label: string; angle: number }[] = [
  { label: "Topo", angle: 0 },
  { label: "Direita", angle: 90 },
  { label: "Baixo", angle: 180 },
  { label: "Esquerda", angle: 270 },
];

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: "start", label: "Início" },
  { value: "center", label: "Centro" },
  { value: "end", label: "Fim" },
];

interface CircularTextSettingsProps {
  config: CircularTextConfig;
  onConfigChange: (config: Partial<CircularTextConfig>) => void;
  overflowWarning?: boolean;
}

export function CircularTextSettings({
  config,
  onConfigChange,
  overflowWarning,
}: CircularTextSettingsProps) {
  const unit = config.unit;
  const decimals = unit === "px" ? 0 : unit === "mm" ? 1 : 2;
  const dragSensitivity = fromPx(1, unit);

  // fontSize/radius must stay positive or the layout math degenerates; letterSpacing
  // has no such constraint, so it keeps the "no limits" scrubbing the user asked for.
  function sizeField(field: "fontSize" | "letterSpacing" | "radius") {
    const min = field === "letterSpacing" ? -Infinity : 1;
    return {
      value: fromPx(config[field], unit),
      onChange: (v: number) =>
        onConfigChange({
          [field]: Math.max(toPx(v, unit), min),
        } as Partial<CircularTextConfig>),
    };
  }

  function handleFontChange(family: string) {
    const font = getFont(family);
    const weight = font.weights.includes(config.fontWeight)
      ? config.fontWeight
      : font.weights.includes(400)
        ? 400
        : font.weights[0];
    onConfigChange({ fontFamily: family, fontWeight: weight });
  }

  const currentFont = getFont(config.fontFamily);

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-4 p-4">
        {/* Conteúdo */}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Texto</Label>
          <Textarea
            className="h-[80px] resize-none text-sm"
            value={config.text}
            placeholder="Digite o texto..."
            onChange={(e) => onConfigChange({ text: e.target.value })}
          />
        </div>

        {overflowWarning && (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-500/10 rounded-md p-2">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            <span>
              O texto é maior que a circunferência disponível e está se
              sobrepondo. Aumente o raio, reduza o tamanho da fonte ou o
              espaçamento.
            </span>
          </div>
        )}

        {/* Fonte */}

        <div className="grid grid-cols-[auto_80px] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Família</Label>
            <FontCombobox
              value={config.fontFamily}
              onChange={handleFontChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Peso</Label>
            <Select
              value={config.fontWeight.toString()}
              onValueChange={(v) => onConfigChange({ fontWeight: parseInt(v) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentFont.weights.map((w) => (
                  <SelectItem key={w} value={w.toString()}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />

        {/* Layout */}
        <SectionHeader title="Layout" />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Unidade</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={unit}
            onValueChange={(v) => v && onConfigChange({ unit: v as Unit })}
            className="w-full"
          >
            <ToggleGroupItem value="px" className="flex-1 text-xs">
              px
            </ToggleGroupItem>
            <ToggleGroupItem value="cm" className="flex-1 text-xs">
              cm
            </ToggleGroupItem>
            <ToggleGroupItem value="mm" className="flex-1 text-xs">
              mm
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <ScrubbableNumberField
          label="Tamanho do texto"
          unit={unit}
          decimals={decimals}
          step={stepFor("fontSize", unit)}
          dragSensitivity={dragSensitivity}
          {...sizeField("fontSize")}
        />

        <ScrubbableNumberField
          label="Espaçamento entre caracteres"
          unit={unit}
          decimals={decimals}
          step={stepFor("letterSpacing", unit)}
          dragSensitivity={dragSensitivity}
          {...sizeField("letterSpacing")}
        />

        <ScrubbableNumberField
          label="Raio do círculo"
          unit={unit}
          decimals={decimals}
          step={stepFor("radius", unit)}
          dragSensitivity={dragSensitivity}
          {...sizeField("radius")}
        />

        <div className="space-y-1.5">
          <ScrubbableNumberField
            label="Ponto de âncora"
            unit="°"
            decimals={0}
            step={1}
            value={config.anchorAngle}
            onChange={(v) => onConfigChange({ anchorAngle: v })}
          />
          <div className="grid grid-cols-4 gap-1.5">
            {ANCHOR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onConfigChange({ anchorAngle: preset.angle })}
                className={`text-[11px] rounded-md border py-1 transition-colors hover:border-primary/60 hover:bg-primary/5 ${
                  config.anchorAngle === preset.angle
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Alinhamento</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={config.align}
            onValueChange={(v) =>
              v && onConfigChange({ align: v as TextAlign })
            }
            className="w-full"
          >
            {ALIGN_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                className="flex-1 text-xs"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="flip" className="text-sm cursor-pointer">
            Inverter posição
          </Label>
          <Switch
            id="flip"
            checked={config.flip}
            onCheckedChange={(v) => onConfigChange({ flip: v })}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="square-canvas" className="text-sm cursor-pointer">
              Canvas quadrado
            </Label>
            <Switch
              id="square-canvas"
              checked={config.squareCanvas}
              onCheckedChange={(v) => onConfigChange({ squareCanvas: v })}
            />
          </div>
        </div>

        <Separator />

        {/* Aparência */}
        <SectionHeader title="Aparência" />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor do texto</Label>
          <ColorPicker
            color={config.color}
            setColor={(color) => onConfigChange({ color })}
            showGradientTab={false}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor de fundo</Label>
          <ColorPicker
            color={config.bgColor}
            setColor={(color) => onConfigChange({ bgColor: color })}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
