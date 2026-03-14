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
import { Slider } from "@/components/ui/slider";
import { IconPickerInput } from "@/components/icon-picker";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { IconSource, IconConfig } from "./types";

interface SliderFieldProps {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderField({
  label,
  value,
  unit = "",
  min,
  max,
  step,
  onChange,
}: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </Label>
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground min-w-[44px] text-center">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1">
      {title}
    </p>
  );
}

interface IconSettingsProps {
  source: IconSource;
  config: IconConfig;
  onSourceChange: (source: IconSource) => void;
  onConfigChange: (config: Partial<IconConfig>) => void;
}

export function IconSettings({
  source,
  config,
  onSourceChange,
  onConfigChange,
}: IconSettingsProps) {
  const isLucide = source.type === "lucide";

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-4 p-4">
        {/* Ícone */}
        <SectionHeader title="Ícone" />

        <IconPickerInput
          value={source.type !== "custom" ? source : undefined}
          onChange={(val) => onSourceChange(val)}
        />

        <div className="flex items-center justify-between">
          <Label htmlFor="custom-svg" className="text-sm cursor-pointer">
            Usar SVG personalizado
          </Label>
          <Switch
            id="custom-svg"
            checked={source.type === "custom"}
            onCheckedChange={(checked) => {
              if (checked) {
                onSourceChange({ type: "custom" });
              } else {
                onSourceChange({ type: "lucide", name: "Atom" });
              }
            }}
          />
        </div>

        {source.type === "custom" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Código SVG</Label>
            <Textarea
              className="h-[140px] font-mono text-xs resize-none"
              value={config.customSVGCode}
              placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>`}
              onChange={(e) => onConfigChange({ customSVGCode: e.target.value })}
            />
          </div>
        )}

        <Separator />

        {/* Aparência */}
        <SectionHeader title="Aparência" />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor do ícone</Label>
          <ColorPicker
            color={config.fgColor}
            setColor={(color) => onConfigChange({ fgColor: color })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor de fundo</Label>
          <ColorPicker
            color={config.bgColor}
            setColor={(color) => onConfigChange({ bgColor: color })}
          />
        </div>

        {isLucide && (
          <SliderField
            label="Espessura do traço"
            value={config.iconStrokeWidth}
            min={0.5}
            max={4}
            step={0.5}
            onChange={(v) => onConfigChange({ iconStrokeWidth: v })}
          />
        )}

        <Separator />

        {/* Forma */}
        <SectionHeader title="Forma" />

        <SliderField
          label="Tamanho"
          value={config.iconSize}
          unit="px"
          min={24}
          max={192}
          step={4}
          onChange={(v) => onConfigChange({ iconSize: v })}
        />

        <SliderField
          label="Rotação"
          value={config.iconRotation}
          unit="°"
          min={-180}
          max={180}
          step={15}
          onChange={(v) => onConfigChange({ iconRotation: v })}
        />

        <SliderField
          label="Arredondamento"
          value={config.borderRadius}
          unit="%"
          min={0}
          max={50}
          step={5}
          onChange={(v) => onConfigChange({ borderRadius: v })}
        />

        <Separator />

        {/* Exportação */}
        <SectionHeader title="Exportação" />

        <div className="flex items-center justify-between">
          <Label htmlFor="guidelines" className="text-sm cursor-pointer">
            Linhas guia
          </Label>
          <Switch
            id="guidelines"
            checked={config.showGuidelines}
            onCheckedChange={(v) => onConfigChange({ showGuidelines: v })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Formato</Label>
          <Select
            value={config.format}
            onValueChange={(value) => onConfigChange({ format: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="svg">SVG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tamanho final</Label>
          <Select
            value={config.imageSize.toString()}
            onValueChange={(value) =>
              onConfigChange({ imageSize: parseInt(value) })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="192">192 × 192 px</SelectItem>
              <SelectItem value="512">512 × 512 px</SelectItem>
              <SelectItem value="1024">1024 × 1024 px</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ScrollArea>
  );
}
