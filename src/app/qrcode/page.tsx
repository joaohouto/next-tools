"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, QrCode } from "lucide-react";
import { copyQRCode, exportQRCode } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/color-picker";
import { CardAnimatedBorder } from "@/components/card-animated-border";

export default function Page() {
  const [text, setText] = useState("");

  const [config, setConfig] = useState({
    bgColor: "#FFFFFF",
    fgColor: "#000000",
    size: 300,
    includeMargin: true,
    customLogo: false,
    format: "png",
  });

  const imageRef = useRef(null);

  return (
    <div className="max-w-screen-md min-h-screen mx-auto p-8 grid md:grid-cols-2 grid-cols-1 content-center gap-4">
      <div className="flex flex-col justify-center items-center">
        {text ? (
          <div className="w-[200px] h-[200px]" ref={imageRef}>
            <QRCodeSVG
              value={text}
              size={200}
              includeMargin={config.includeMargin}
              fgColor={config.fgColor}
              bgColor={config.bgColor}
            />
          </div>
        ) : (
          <CardAnimatedBorder className="w-[200px] h-[200px] text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center">
            <QrCode size={148} />
          </CardAnimatedBorder>
        )}

        <div className="grid grid-cols-2 gap-2 my-4">
          <Button
            disabled={!text}
            onClick={() => {
              copyQRCode(imageRef.current, config);
            }}
          >
            <Copy size={18} />
            Copiar
          </Button>

          <Button
            disabled={!text}
            onClick={() => {
              exportQRCode(imageRef.current, config, `qrcode-${text}`);
            }}
          >
            <Download size={18} />
            Baixar
          </Button>
        </div>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Seu link, texto, etc."
          autoFocus
        />
      </div>

      <div className="flex flex-col space-y-2">
        <Label>Configurações</Label>

        <div className="flex items-center space-x-2">
          <Switch
            id="include-margin"
            checked={config.includeMargin}
            onCheckedChange={(value) => {
              setConfig({ ...config, includeMargin: value });
            }}
          />
          <Label htmlFor="include-margin">Adicionar margem</Label>
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

        <Label>Tamanho (largua x altura - px)</Label>
        <Input
          type="number"
          value={config.size}
          min={100}
          onChange={(e) => {
            setConfig({ ...config, size: parseInt(e.target.value) });
          }}
        />

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
      </div>
    </div>
  );
}
