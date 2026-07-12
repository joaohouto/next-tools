"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, QrCode, ImagePlus } from "lucide-react";
import { copyQRCode, exportQRCode } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/color-picker";
import FileDropzone from "@/components/file-dropzone";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { IconWeight } from "@phosphor-icons/react";
import { buildWifiPayload, type WifiConfig } from "./wifi";
import { CENTER_ICONS, ICON_WEIGHTS, iconToDataUri, fileToDataUrl } from "./center-image";

const SIZE_OPTIONS = [128, 256, 512, 1024];
const FORMAT_OPTIONS = ["PNG", "SVG"];
const CENTER_IMAGE_MIN = 24;
// Capped at 56 (28% of the 200px preview) — verified via round-trip scan tests that
// 60px+ starts failing to decode even at error-correction level "H".
const CENTER_IMAGE_MAX = 56;
const CENTER_IMAGE_DEFAULT = 40;
const SECURITY_LABELS: Record<WifiConfig["security"], string> = {
  WPA: "WPA/WPA2",
  WEP: "WEP",
  nopass: "Nenhuma",
};

type CenterMode = "none" | "icon" | "upload";

export function QRCodeGenerator() {
  const [qrType, setQrType] = useState<"text" | "wifi">("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState<WifiConfig>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [config, setConfig] = useState({
    bgColor: "#FFFFFF",
    fgColor: "#000000",
    size: 512,
    includeMargin: true,
    format: "png",
  });
  const [centerMode, setCenterMode] = useState<CenterMode>("none");
  const [centerIconId, setCenterIconId] = useState<string | null>(null);
  const [centerIconWeight, setCenterIconWeight] = useState<IconWeight>("regular");
  const [centerUploadSrc, setCenterUploadSrc] = useState<string | null>(null);
  const [centerImageSize, setCenterImageSize] = useState(CENTER_IMAGE_DEFAULT);

  const imageRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const value = qrType === "wifi" ? buildWifiPayload(wifi) : text;
  const hasValue = qrType === "wifi" ? !!wifi.ssid : !!text;

  const selectedCenterIcon = centerIconId ? CENTER_ICONS.find((i) => i.id === centerIconId) : undefined;
  const centerImageSrc =
    centerMode === "icon" && selectedCenterIcon
      ? iconToDataUri(selectedCenterIcon.Icon, centerIconWeight, config.fgColor, config.bgColor)
      : centerMode === "upload" && centerUploadSrc
        ? centerUploadSrc
        : undefined;

  const handleCenterUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setCenterUploadSrc(await fileToDataUrl(file));
    setCenterMode("upload");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR preview */}
      <div className="relative flex items-center justify-center rounded-2xl border bg-muted/30 p-6">
        {value ? (
          <div ref={imageRef}>
            <QRCodeSVG
              value={value}
              size={200}
              includeMargin={config.includeMargin}
              fgColor={config.fgColor}
              bgColor={config.bgColor}
              level={centerImageSrc ? "H" : "L"}
              imageSettings={centerImageSrc ? { src: centerImageSrc, height: centerImageSize, width: centerImageSize, excavate: true } : undefined}
            />
          </div>
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center text-muted-foreground/30">
            <QrCode size={164} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Type selector + Settings, grouped with a tighter gap between them */}
      <div className="w-full flex flex-col gap-3">
        <Tabs value={qrType} onValueChange={(v) => setQrType(v as "text" | "wifi")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Texto</TabsTrigger>
            <TabsTrigger value="wifi">WiFi</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="URL, texto, contato..."
              autoFocus={!isMobile}
              className="text-center"
            />
          </TabsContent>

          <TabsContent value="wifi" className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Nome da rede (SSID)</Label>
              <Input
                value={wifi.ssid}
                onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                placeholder="Minha rede WiFi"
                autoFocus={!isMobile}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Segurança</Label>
                <Select
                  value={wifi.security}
                  onValueChange={(v) => setWifi({ ...wifi, security: v as WifiConfig["security"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SECURITY_LABELS) as WifiConfig["security"][]).map((s) => (
                      <SelectItem key={s} value={s}>{SECURITY_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Senha</Label>
                <Input
                  value={wifi.password}
                  onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                  placeholder="Senha da rede"
                  disabled={wifi.security === "nopass"}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label className="text-xs text-muted-foreground">Rede oculta</Label>
              <Switch checked={wifi.hidden} onCheckedChange={(c) => setWifi({ ...wifi, hidden: c })} />
            </div>
          </TabsContent>
        </Tabs>

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

          {/* Center icon/image */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Ícone central</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 font-normal overflow-hidden">
                  {centerMode === "icon" && selectedCenterIcon ? (
                    <selectedCenterIcon.Icon className="h-4 w-4 shrink-0" weight={centerIconWeight} />
                  ) : centerMode === "upload" && centerUploadSrc ? (
                    <img src={centerUploadSrc} alt="" className="h-4 w-4 rounded-sm object-cover shrink-0" />
                  ) : (
                    <ImagePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">
                    {centerMode === "icon" && selectedCenterIcon
                      ? selectedCenterIcon.label
                      : centerMode === "upload" && centerUploadSrc
                        ? "Imagem enviada"
                        : "Nenhum"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 flex flex-col gap-3">
                <button
                  onClick={() => setCenterMode("none")}
                  className={cn(
                    "text-xs rounded-md border py-1.5 w-full transition-all active:scale-95",
                    centerMode === "none" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted",
                  )}
                >
                  Nenhum
                </button>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Estilo do ícone</span>
                  <div className="grid grid-cols-4 gap-1">
                    {ICON_WEIGHTS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setCenterIconWeight(value)}
                        className={cn(
                          "rounded-md border py-1 text-[11px] font-medium transition-all active:scale-95",
                          centerIconWeight === value
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {CENTER_ICONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      title={label}
                      onClick={() => { setCenterMode("icon"); setCenterIconId(id); }}
                      className={cn(
                        "flex items-center justify-center rounded-md border h-8 w-8 transition-all active:scale-95",
                        centerMode === "icon" && centerIconId === id
                          ? "border-primary/40 bg-primary/10"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <Icon size={16} weight={centerIconWeight} />
                    </button>
                  ))}
                </div>
                <Separator />
                <FileDropzone
                  onUpload={handleCenterUpload}
                  accept="image/*"
                  label="Enviar imagem própria"
                  compact
                />
              </PopoverContent>
            </Popover>
            {centerMode !== "none" && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] text-muted-foreground shrink-0">Tamanho</span>
                <Slider
                  value={[centerImageSize]}
                  onValueChange={([v]) => setCenterImageSize(v)}
                  min={CENTER_IMAGE_MIN}
                  max={CENTER_IMAGE_MAX}
                  step={2}
                  className="flex-1"
                />
                <span className="text-[11px] font-mono text-muted-foreground w-9 text-right shrink-0">{centerImageSize}px</span>
              </div>
            )}
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
      </div>

      {/* Actions */}
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={!hasValue}
          onClick={() => copyQRCode(imageRef.current, config)}
        >
          <Copy className="size-4" />
          Copiar
        </Button>
        <Button
          disabled={!hasValue}
          onClick={() =>
            exportQRCode(imageRef.current, config, `qrcode-${qrType === "wifi" ? wifi.ssid : text}`)
          }
        >
          <Download className="size-4" />
          Baixar
        </Button>
      </div>
    </div>
  );
}
