"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, QrCode, ImagePlus } from "lucide-react";
import { copyQRCode, exportQRCode } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/color-picker";
import FileDropzone from "@/components/file-dropzone";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { IconWeight } from "@phosphor-icons/react";
import { buildWifiPayload, type WifiConfig } from "./wifi";
import { buildPixPayload, type PixConfig } from "./pix";
import {
  buildVCardPayload, buildEmailPayload, buildSmsPayload, buildTelPayload, buildGeoPayload, buildEventPayload,
  type VCardConfig, type EmailConfig, type SmsConfig, type TelConfig, type GeoConfig, type EventConfig,
} from "./payloads";
import { WifiForm, PixForm, VCardForm, EmailForm, SmsForm, TelForm, GeoForm, EventForm } from "./forms";
import { CENTER_ICONS, ICON_WEIGHTS, iconToDataUri, fileToDataUrl } from "./center-image";

const SIZE_OPTIONS = [128, 256, 512, 1024];
const FORMAT_OPTIONS = ["PNG", "SVG"];
const CENTER_IMAGE_MIN = 24;
// Capped at 56 (28% of the 200px preview) — verified via round-trip scan tests that
// 60px+ starts failing to decode even at error-correction level "H".
const CENTER_IMAGE_MAX = 56;
const CENTER_IMAGE_DEFAULT = 40;

type QrType = "text" | "wifi" | "pix" | "vcard" | "email" | "sms" | "tel" | "geo" | "event";

const QR_TYPE_OPTIONS: { value: QrType; label: string }[] = [
  { value: "text", label: "Texto / URL" },
  { value: "wifi", label: "WiFi" },
  { value: "pix", label: "PIX" },
  { value: "vcard", label: "Contato (vCard)" },
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS" },
  { value: "tel", label: "Telefone" },
  { value: "geo", label: "Localização" },
  { value: "event", label: "Evento" },
];

type CenterMode = "none" | "icon" | "upload";

export function QRCodeGenerator() {
  const [qrType, setQrType] = useState<QrType>("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState<WifiConfig>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [pix, setPix] = useState<PixConfig>({ key: "", merchantName: "", merchantCity: "", amount: "", description: "" });
  const [vcard, setVcard] = useState<VCardConfig>({ name: "", phone: "", email: "", org: "", url: "" });
  const [email, setEmail] = useState<EmailConfig>({ to: "", subject: "", body: "" });
  const [sms, setSms] = useState<SmsConfig>({ phone: "", message: "" });
  const [tel, setTel] = useState<TelConfig>({ phone: "" });
  const [geo, setGeo] = useState<GeoConfig>({ lat: "", lon: "", label: "" });
  const [calendarEvent, setCalendarEvent] = useState<EventConfig>({ title: "", start: "", end: "", location: "", description: "" });

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

  const value = useMemo(() => {
    switch (qrType) {
      case "wifi": return wifi.ssid ? buildWifiPayload(wifi) : "";
      case "pix": return pix.key && pix.merchantName && pix.merchantCity ? buildPixPayload(pix) : "";
      case "vcard": return vcard.name ? buildVCardPayload(vcard) : "";
      case "email": return email.to ? buildEmailPayload(email) : "";
      case "sms": return sms.phone ? buildSmsPayload(sms) : "";
      case "tel": return tel.phone ? buildTelPayload(tel) : "";
      case "geo": return geo.lat && geo.lon ? buildGeoPayload(geo) : "";
      case "event": return calendarEvent.title && calendarEvent.start ? buildEventPayload(calendarEvent) : "";
      default: return text;
    }
  }, [qrType, text, wifi, pix, vcard, email, sms, tel, geo, calendarEvent]);

  const hasValue = !!value;

  const fileNameBase = useMemo(() => {
    switch (qrType) {
      case "wifi": return wifi.ssid;
      case "pix": return pix.key;
      case "vcard": return vcard.name;
      case "email": return email.to;
      case "sms": return sms.phone;
      case "tel": return tel.phone;
      case "geo": return `${geo.lat},${geo.lon}`;
      case "event": return calendarEvent.title;
      default: return text;
    }
  }, [qrType, text, wifi, pix, vcard, email, sms, tel, geo, calendarEvent]);

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
        <Select value={qrType} onValueChange={(v) => setQrType(v as QrType)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {QR_TYPE_OPTIONS.map(({ value: v, label }) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {qrType === "text" && (
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="URL, texto, contato..."
            autoFocus={!isMobile}
            className="text-center"
          />
        )}
        {qrType === "wifi" && <WifiForm value={wifi} onChange={(p) => setWifi((v) => ({ ...v, ...p }))} />}
        {qrType === "pix" && <PixForm value={pix} onChange={(p) => setPix((v) => ({ ...v, ...p }))} />}
        {qrType === "vcard" && <VCardForm value={vcard} onChange={(p) => setVcard((v) => ({ ...v, ...p }))} />}
        {qrType === "email" && <EmailForm value={email} onChange={(p) => setEmail((v) => ({ ...v, ...p }))} />}
        {qrType === "sms" && <SmsForm value={sms} onChange={(p) => setSms((v) => ({ ...v, ...p }))} />}
        {qrType === "tel" && <TelForm value={tel} onChange={(p) => setTel((v) => ({ ...v, ...p }))} />}
        {qrType === "geo" && <GeoForm value={geo} onChange={(p) => setGeo((v) => ({ ...v, ...p }))} />}
        {qrType === "event" && <EventForm value={calendarEvent} onChange={(p) => setCalendarEvent((v) => ({ ...v, ...p }))} />}

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
            exportQRCode(imageRef.current, config, `qrcode-${fileNameBase}`)
          }
        >
          <Download className="size-4" />
          Baixar
        </Button>
      </div>
    </div>
  );
}
