"use client";

import { useRef, useState } from "react";
import { CopyIcon, DownloadIcon, Moon, Sun } from "lucide-react";
import { copyImage, exportAsImage } from "@/lib/export-image";
import { Button } from "@/components/ui/button";

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
import { IconRenderer } from "@/hooks/use-icon-picker";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import CustomSvgFromString from "@/components/svg-string";
import { IconGridTemplate } from "@/components/icon-grid-template";

export default function Page() {
  const [selectedIcon, setSelectedIcon] = useState("Atom");

  const [config, setConfig] = useState({
    bgColor: "#111111",
    fgColor: "#FFFFFF",
    useCustomSVG: false,
    customSVGCode: "",
    iconSize: 126,
    iconStrokeWidth: 1,
    iconRotation: 0,
    borderRadius: 0,
    imageSize: 192,
    format: "png",
    showGuidelines: false,
  });

  const imageRef = useRef(null);

  return (
    <div className="w-screen h-screen p-4 grid grid-rows-[220px_auto] gap-6 lg:grid-cols-[auto_274px] lg:grid-rows-1">
      <div className="rounded-md border overflow-auto p-8 flex items-center justify-center bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px]">
        {config.showGuidelines && <IconGridTemplate />}
        <div
          ref={imageRef}
          id="icon"
          style={{
            background: config.bgColor,
            color: config.fgColor,
            borderRadius: `${config.borderRadius}%`,
          }}
          className="h-[192px] w-[192px] flex items-center justify-center"
        >
          {config.useCustomSVG ? (
            <CustomSvgFromString
              svgString={config.customSVGCode}
              size={config.iconSize}
              fill={config.fgColor}
              style={{
                transform: `rotate(${config.iconRotation}deg)`,
              }}
            />
          ) : (
            <IconRenderer
              icon={selectedIcon}
              strokeWidth={config.iconStrokeWidth}
              size={config.iconSize}
              style={{
                transform: `rotate(${config.iconRotation}deg)`,
              }}
            />
          )}
        </div>
      </div>

      <div className="h-full rounded-md border flex flex-col justify-between">
        <div className="flex flex-col gap-2 p-4 overflow-auto">
          <IconPickerInput
            defaultIcon="Atom"
            onChange={(iconName) => setSelectedIcon(iconName)}
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="custom-svg"
              checked={config.useCustomSVG}
              onCheckedChange={(value) => {
                setConfig({ ...config, useCustomSVG: value });
              }}
            />
            <Label htmlFor="custom-svg">Usar código SVG para ícone</Label>
          </div>

          {config.useCustomSVG && (
            <>
              <Label>Código SVG</Label>
              <Textarea
                className="h-[200px]"
                value={config.customSVGCode}
                placeholder="<svg ..."
                onChange={(e) => {
                  setConfig({ ...config, customSVGCode: e.target.value });
                }}
              />
            </>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="show-guidelines"
              checked={config.showGuidelines}
              onCheckedChange={(value) => {
                setConfig({ ...config, showGuidelines: value });
              }}
            />
            <Label htmlFor="show-guidelines">Linhas guia</Label>
          </div>

          <Label>Cor do ícone</Label>
          <ColorPicker
            color={config.fgColor}
            setColor={(color) => {
              setConfig({ ...config, fgColor: color });
            }}
          />

          <Label>Cor de fundo</Label>
          <ColorPicker
            color={config.bgColor}
            setColor={(color) => {
              setConfig({ ...config, bgColor: color });
            }}
          />

          <Label>Espessura do traçado</Label>
          <div className="flex gap-2">
            <div className="font-mono bg-muted text-muted-foreground rounded-md text-sm h-6 w-12 flex items-center justify-center">
              {config.iconStrokeWidth.toFixed(1)}
            </div>

            <Slider
              value={[config.iconStrokeWidth]}
              onValueChange={(value) => {
                setConfig({ ...config, iconStrokeWidth: value[0] });
              }}
              max={4}
              min={0.5}
              step={0.5}
            />
          </div>

          <Label>Tamanho do ícone</Label>
          <div className="flex gap-2">
            <div className="font-mono bg-muted text-muted-foreground rounded-md text-sm h-6 w-12 flex items-center justify-center">
              {config.iconSize}
            </div>
            <Slider
              value={[config.iconSize]}
              onValueChange={(value) => {
                setConfig({ ...config, iconSize: value[0] });
              }}
              max={192}
              min={54}
              step={8}
            />
          </div>

          <Label>Rotação</Label>
          <div className="flex gap-2">
            <div className="font-mono bg-muted text-muted-foreground rounded-md text-sm h-6 w-12 flex items-center justify-center">
              {config.iconRotation}°
            </div>
            <Slider
              value={[config.iconRotation]}
              onValueChange={(value) => {
                setConfig({ ...config, iconRotation: value[0] });
              }}
              max={180}
              min={-180}
              step={15}
            />
          </div>

          <Label>Arredondamento de canto</Label>
          <div className="flex gap-2">
            <div className="font-mono bg-muted text-muted-foreground rounded-md text-sm h-6 w-12 flex items-center justify-center">
              {config.borderRadius}%
            </div>
            <Slider
              value={[config.borderRadius]}
              onValueChange={(value) => {
                setConfig({ ...config, borderRadius: value[0] });
              }}
              max={50}
              min={0}
              step={5}
            />
          </div>

          <Label>Formato</Label>
          <Select
            value={config.format}
            onValueChange={(value) => setConfig({ ...config, format: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um formato de imagem">
                {config.format}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="svg">SVG</SelectItem>
            </SelectContent>
          </Select>

          <Label>Tamanho da imagem final</Label>
          <Select
            value={config.imageSize.toString()}
            onValueChange={(value) =>
              setConfig({ ...config, imageSize: parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um tamanho de imagem">
                {config.imageSize.toString()}px
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="192">192px</SelectItem>
              <SelectItem value="512">512px</SelectItem>
              <SelectItem value="1024">1024px</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 items-center gap-2 p-4">
          <Button
            variant="outline"
            onClick={() =>
              copyImage(
                imageRef.current,
                {
                  canvasHeight: config.imageSize,
                  canvasWidth: config.imageSize,
                },
                config.format
              )
            }
          >
            <CopyIcon /> Copiar
          </Button>

          <Button
            onClick={() =>
              exportAsImage(
                imageRef.current,
                `icon`,
                {
                  canvasHeight: config.imageSize,
                  canvasWidth: config.imageSize,
                },
                config.format
              )
            }
          >
            <DownloadIcon /> Download
          </Button>
        </div>
      </div>
    </div>
  );
}
