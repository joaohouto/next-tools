"use client";

import { ColorPicker } from "@/components/color-picker";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrubbableNumberField } from "@/components/ui/scrubbable-number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { clamp } from "./helpers";
import { BENTO_TEMPLATES, MAX_CUSTOM_DIMENSION, MIN_CUSTOM_DIMENSION, RATIO_OPTIONS, SIZE_PRESETS } from "./templates";
import type { MosaicCategory, MosaicConfig, MosaicTemplate, SizePresetId } from "./types";
import { cn } from "@/lib/utils";

const LAYOUT_OPTIONS: { id: Extract<MosaicCategory, "grid" | "columns" | "rows" | "smart">; label: string }[] = [
  { id: "grid", label: "Grade" },
  { id: "columns", label: "Colunas" },
  { id: "rows", label: "Linhas" },
  { id: "smart", label: "Inteligente" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1">
      {title}
    </p>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderField({ label, value, unit = "", min, max, step, onChange }: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground min-w-[44px] text-center">
          {value}
          {unit}
        </span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

/** Miniature live rendering of a template's cell layout, using the same grid mechanism as the real preview. */
function TemplateDiagram({ template }: { template: MosaicTemplate }) {
  return (
    <div
      className="grid aspect-square w-full gap-0.5"
      style={{
        gridTemplateColumns: `repeat(${template.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${template.rows}, minmax(0, 1fr))`,
      }}
    >
      {template.cells.map((cell, i) => (
        <div
          key={i}
          className="rounded-[2px] bg-muted-foreground/40"
          style={{
            gridColumn: `${cell.col} / span ${cell.colSpan}`,
            gridRow: `${cell.row} / span ${cell.rowSpan}`,
          }}
        />
      ))}
    </div>
  );
}

interface MosaicSettingsProps {
  config: MosaicConfig;
  photoCount: number;
  onConfigChange: (updates: Partial<MosaicConfig>) => void;
}

export function MosaicSettings({ config, photoCount, onConfigChange }: MosaicSettingsProps) {
  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-4 p-4">
        <SectionHeader title="Layout" />

        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_OPTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => onConfigChange({ templateCategory: c.id, bentoTemplateId: null })}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                config.templateCategory === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:border-foreground/40",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {config.templateCategory === "smart" && (
          <p className="text-[11px] text-muted-foreground leading-relaxed -mt-2">
            No modo Inteligente a proporção final é aproximada: cada foto é só
            escalada (nunca cortada além do necessário) para manter a
            proporção original o máximo possível.
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Bento</Label>
          <div className="grid grid-cols-2 gap-2">
            {BENTO_TEMPLATES.map((t) => {
              const matches = t.cells.length === photoCount;
              const active = config.templateCategory === "bento" && config.bentoTemplateId === t.id;
              return (
                <button
                  key={t.id}
                  disabled={!matches}
                  onClick={() => onConfigChange({ templateCategory: "bento", bentoTemplateId: t.id })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all",
                    active
                      ? "border-primary bg-primary/10"
                      : matches
                        ? "border-border hover:border-foreground/40"
                        : "border-border opacity-40 cursor-not-allowed",
                  )}
                >
                  <TemplateDiagram template={t} />
                  <span className="text-[11px] font-medium leading-tight">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {matches ? `${t.cells.length} fotos` : `Precisa de ${t.cells.length} fotos`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <SectionHeader title="Proporção" />

        <div className="grid grid-cols-3 gap-2">
          {RATIO_OPTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onConfigChange({ aspectRatio: r.id })}
              className={cn(
                "px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                config.aspectRatio === r.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:border-foreground/40",
              )}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => onConfigChange({ aspectRatio: "custom" })}
            className={cn(
              "px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
              config.aspectRatio === "custom"
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:border-foreground/40",
            )}
          >
            Personalizado
          </button>
        </div>

        {config.aspectRatio === "custom" ? (
          <div className="space-y-2">
            <ScrubbableNumberField
              label="Largura"
              value={config.customWidth}
              unit="px"
              step={10}
              onChange={(v) => onConfigChange({ customWidth: clamp(v, MIN_CUSTOM_DIMENSION, MAX_CUSTOM_DIMENSION) })}
            />
            <ScrubbableNumberField
              label="Altura"
              value={config.customHeight}
              unit="px"
              step={10}
              onChange={(v) => onConfigChange({ customHeight: clamp(v, MIN_CUSTOM_DIMENSION, MAX_CUSTOM_DIMENSION) })}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tamanho</Label>
            <Select
              value={config.sizePreset}
              onValueChange={(v) => onConfigChange({ sizePreset: v as SizePresetId })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_PRESETS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label} ({s.longestEdge}px)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <SectionHeader title="Aparência" />

        <SliderField
          label="Arredondamento"
          value={config.radius}
          unit="px"
          min={0}
          max={64}
          step={2}
          onChange={(v) => onConfigChange({ radius: v })}
        />

        <SliderField
          label="Espaçamento"
          value={config.gap}
          unit="px"
          min={0}
          max={32}
          step={2}
          onChange={(v) => onConfigChange({ gap: v })}
        />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor de fundo</Label>
          <ColorPicker
            color={config.backgroundColor}
            setColor={(color) => onConfigChange({ backgroundColor: color })}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
