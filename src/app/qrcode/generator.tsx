"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, QrCode } from "lucide-react";
import { copyQRCode, exportQRCode } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/color-picker";
import { useIsMobile } from "@/hooks/use-mobile";

const SIZE_OPTIONS = [128, 256, 512, 1024];
const FORMAT_OPTIONS = ["PNG", "SVG"];

export function QRCodeGenerator() {
  const [text, setText] = useState("");
  const [config, setConfig] = useState({
    bgColor: "#FFFFFF",
    fgColor: "#000000",
    size: 512,
    includeMargin: true,
    format: "png",
  });

  const imageRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR preview */}
      <div className="relative flex items-center justify-center rounded-2xl border bg-muted/30 p-6">
        {text ? (
          <div ref={imageRef}>
            <QRCodeSVG
              value={text}
              size={200}
              includeMargin={config.includeMargin}
              fgColor={config.fgColor}
              bgColor={config.bgColor}
            />
          </div>
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center text-muted-foreground/30">
            <QrCode size={164} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Text input */}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="URL, texto, contato..."
        autoFocus={!isMobile}
        className="text-center"
      />

      {/* Settings */}
      <div className="w-full rounded-xl border bg-muted/20 p-4 flex flex-col gap-4">
        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Cor do QR</span>
            <ColorPicker
              color={config.fgColor}
              setColor={(c) => setConfig({ ...config, fgColor: c })}
              showGradientTab={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Cor de fundo</span>
            <ColorPicker
              color={config.bgColor}
              setColor={(c) => setConfig({ ...config, bgColor: c })}
              showGradientTab={false}
            />
          </div>
        </div>

        {/* Size */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Tamanho (px)</span>
          <div className="grid grid-cols-4 gap-1.5">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setConfig({ ...config, size: s })}
                className={`rounded-lg border py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  config.size === s
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Format + Margin */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-xs text-muted-foreground">Formato</span>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    setConfig({ ...config, format: f.toLowerCase() })
                  }
                  className={`rounded-lg border py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    config.format === f.toLowerCase()
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-xs text-muted-foreground">Margem</span>
            <button
              onClick={() =>
                setConfig({ ...config, includeMargin: !config.includeMargin })
              }
              className={`rounded-lg border py-1.5 text-xs font-medium transition-all active:scale-95 ${
                config.includeMargin
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {config.includeMargin ? "Com margem" : "Sem margem"}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={!text}
          onClick={() => copyQRCode(imageRef.current, config)}
        >
          <Copy className="size-4" />
          Copiar
        </Button>
        <Button
          disabled={!text}
          onClick={() =>
            exportQRCode(imageRef.current, config, `qrcode-${text}`)
          }
        >
          <Download className="size-4" />
          Baixar
        </Button>
      </div>
    </div>
  );
}
