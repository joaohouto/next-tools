"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WifiConfig } from "./wifi";
import type { PixConfig } from "./pix";
import type { VCardConfig, EmailConfig, SmsConfig, TelConfig, GeoConfig, EventConfig } from "./payloads";

interface FormProps<T> {
  value: T;
  onChange: (patch: Partial<T>) => void;
}

const SECURITY_LABELS: Record<WifiConfig["security"], string> = {
  WPA: "WPA/WPA2",
  WEP: "WEP",
  nopass: "Nenhuma",
};

export function WifiForm({ value, onChange }: FormProps<WifiConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Nome da rede (SSID)</Label>
        <Input value={value.ssid} onChange={(e) => onChange({ ssid: e.target.value })} placeholder="Minha rede WiFi" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Segurança</Label>
          <Select value={value.security} onValueChange={(v) => onChange({ security: v as WifiConfig["security"] })}>
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
            value={value.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Senha da rede"
            disabled={value.security === "nopass"}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <Label className="text-xs text-muted-foreground">Rede oculta</Label>
        <Switch checked={value.hidden} onCheckedChange={(c) => onChange({ hidden: c })} />
      </div>
    </div>
  );
}

export function PixForm({ value, onChange }: FormProps<PixConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Chave PIX</Label>
        <Input
          value={value.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Nome do recebedor</Label>
          <Input value={value.merchantName} onChange={(e) => onChange({ merchantName: e.target.value })} placeholder="Nome" maxLength={25} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Cidade</Label>
          <Input value={value.merchantCity} onChange={(e) => onChange({ merchantCity: e.target.value })} placeholder="Cidade" maxLength={15} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Valor (opcional)</Label>
          <Input value={value.amount} onChange={(e) => onChange({ amount: e.target.value })} placeholder="0,00" inputMode="decimal" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
          <Input value={value.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Referência" />
        </div>
      </div>
    </div>
  );
}

export function VCardForm({ value, onChange }: FormProps<VCardConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Nome</Label>
        <Input value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Nome completo" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Telefone</Label>
          <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+55 11 91234-5678" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">E-mail</Label>
          <Input value={value.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="email@exemplo.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Empresa</Label>
          <Input value={value.org} onChange={(e) => onChange({ org: e.target.value })} placeholder="Empresa" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Site</Label>
          <Input value={value.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://..." />
        </div>
      </div>
    </div>
  );
}

export function EmailForm({ value, onChange }: FormProps<EmailConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Destinatário</Label>
        <Input value={value.to} onChange={(e) => onChange({ to: e.target.value })} placeholder="email@exemplo.com" autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Assunto (opcional)</Label>
        <Input value={value.subject} onChange={(e) => onChange({ subject: e.target.value })} placeholder="Assunto" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Mensagem (opcional)</Label>
        <Textarea value={value.body} onChange={(e) => onChange({ body: e.target.value })} placeholder="Mensagem" className="min-h-16 text-sm" />
      </div>
    </div>
  );
}

export function SmsForm({ value, onChange }: FormProps<SmsConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Número</Label>
        <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+55 11 91234-5678" autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Mensagem (opcional)</Label>
        <Textarea value={value.message} onChange={(e) => onChange({ message: e.target.value })} placeholder="Mensagem" className="min-h-16 text-sm" />
      </div>
    </div>
  );
}

export function TelForm({ value, onChange }: FormProps<TelConfig>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Número</Label>
      <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+55 11 91234-5678" autoFocus />
    </div>
  );
}

export function GeoForm({ value, onChange }: FormProps<GeoConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Latitude</Label>
          <Input value={value.lat} onChange={(e) => onChange({ lat: e.target.value })} placeholder="-23.550520" inputMode="decimal" autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Longitude</Label>
          <Input value={value.lon} onChange={(e) => onChange({ lon: e.target.value })} placeholder="-46.633308" inputMode="decimal" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Rótulo (opcional)</Label>
        <Input value={value.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Nome do local" />
      </div>
    </div>
  );
}

export function EventForm({ value, onChange }: FormProps<EventConfig>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Título</Label>
        <Input value={value.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Nome do evento" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Início</Label>
          <Input type="datetime-local" value={value.start} onChange={(e) => onChange({ start: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Fim (opcional)</Label>
          <Input type="datetime-local" value={value.end} onChange={(e) => onChange({ end: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Local (opcional)</Label>
        <Input value={value.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="Endereço ou local" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
        <Textarea value={value.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Detalhes" className="min-h-16 text-sm" />
      </div>
    </div>
  );
}
