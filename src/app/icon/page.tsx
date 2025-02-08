"use client";

import { useRef, useState } from "react";
import { Atom, CopyIcon, DownloadIcon, Moon, Sun } from "lucide-react";
import { copyImage, exportAsImage } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";

import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPicker } from "@/components/icon-picker";
import { Slider } from "@/components/ui/slider";

export default function Page() {
  const [SelectedIcon, setSelectedIcon] = useState<any>(Atom);

  const [config, setConfig] = useState({
    bgColor: "#111111",
    fgColor: "#FFFFFF",
    iconSize: 96,
    iconStrokeWidth: 1,
    imageSize: 512,
    format: "png",
  });

  const imageRef = useRef(null);

  const { theme, setTheme } = useTheme();

  return (
    <div className="w-screen h-screen p-4 gap-4 flex flex-col overflow-hidden">
      <div className="grid h-[calc(100vh-36px-48px)] grid-rows-2 gap-6  lg:grid-cols-[auto_274px] lg:grid-rows-1">
        <div className="rounded-md border overflow-auto p-8 flex items-center justify-center bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px]">
          <div
            id="icon"
            style={{
              background: config.bgColor,
              color: config.fgColor,
            }}
            className="h-[192px] w-[192px] flex items-center justify-center"
          >
            {
              <SelectedIcon
                size={config.iconSize}
                strokeWidth={config.iconStrokeWidth}
              />
            }
          </div>
        </div>

        <div className="h-full rounded-md border flex flex-col gap-2 p-4 overflow-auto">
          <IconPicker onChangeIcon={(Icon) => setSelectedIcon(Icon)} />

          <Label>Cor de destaque</Label>
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

          <Label>Tamanho da imagem final (px)</Label>
          <Select
            value={config.imageSize.toString()}
            onValueChange={(value) =>
              setConfig({ ...config, imageSize: parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um tamanho de imagem">
                {config.imageSize.toString()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="192">192px</SelectItem>
              <SelectItem value="512">512px</SelectItem>
              <SelectItem value="1024">1024px</SelectItem>
            </SelectContent>
          </Select>

          <Label>Espessura do traçado</Label>
          <Slider
            value={[config.iconStrokeWidth]}
            onValueChange={(value) => {
              setConfig({ ...config, iconStrokeWidth: value[0] });
            }}
            max={4}
            min={0.1}
            step={0.5}
          />

          <Label>Tamanho do ícone</Label>
          <Slider
            value={[config.iconSize]}
            onValueChange={(value) => {
              setConfig({ ...config, iconSize: value[0] });
            }}
            max={152}
            min={54}
            step={8}
          />
        </div>
      </div>

      <nav className="flex flex-row-reverse items-center gap-2">
        <Button variant="outline" onClick={() => copyImage(imageRef.current)}>
          <CopyIcon /> Copiar
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            exportAsImage(
              imageRef.current,
              `icon-${dayjs().format("DD-MM-YYYY-HH-mm")}`
            )
          }
        >
          <DownloadIcon /> Download
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (theme === "light") {
              setTheme("dark");
            } else {
              setTheme("light");
            }
          }}
          title="Alternar tema"
          className="btn"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
      </nav>
    </div>
  );
}
