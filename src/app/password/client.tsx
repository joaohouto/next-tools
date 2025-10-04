"use client";

import { useEffect, useRef, useState } from "react";
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
import { generatePassword } from "@/lib/generate-password";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BadgeRotateBorder } from "@/components/badge-rotate-border";

export default function Page() {
  const [pass, setPass] = useState("...");
  const [config, setConfig] = useState({
    size: 16,
    useEspecialCharacters: true,
    useNumbers: true,
    useUppercase: true,
    useSmallCase: true,
  });

  useEffect(() => {
    createPass();
  }, [config]);

  const createPass = () => {
    const pass = generatePassword(config);

    setPass(pass);
  };
  return (
    <div className="max-w-screen-sm min-h-screen mx-auto p-8 flex flex-col items-center justify-center space-y-4">
      <CardAnimatedBorder className="mb-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(pass);
            toast.success("Senha copiada!");
          }}
          className="w-full flex items-center justify-between gap-4"
        >
          <div className="truncate font-mono">
            <strong>{pass || "..."}</strong>
          </div>

          <Badge className="flex gap-1">
            <Copy size={16} />
            Copiar
          </Badge>
        </button>
      </CardAnimatedBorder>

      <div className="max-w-[400px] flex flex-col gap-2">
        <Label>Tamanho</Label>
        <Input
          value={config.size}
          onChange={(e) => {
            if (parseInt(e.target.value) > 100) {
              return;
            }
            setConfig({ ...config, size: parseInt(e.target.value) });
          }}
          type="number"
        />

        <div className="flex items-center space-x-2">
          <Switch
            id="numbers"
            checked={config.useNumbers}
            onCheckedChange={(value) => {
              setConfig({ ...config, useNumbers: value });
            }}
          />
          <Label htmlFor="numbers">
            Números <small>(123)</small>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="small-cases"
            checked={config.useSmallCase}
            onCheckedChange={(value) => {
              setConfig({ ...config, useSmallCase: value });
            }}
          />
          <Label htmlFor="small-cases">
            Letras minúsculas <small>(abc)</small>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="upper-cases"
            checked={config.useUppercase}
            onCheckedChange={(value) => {
              setConfig({ ...config, useUppercase: value });
            }}
          />
          <Label htmlFor="upper-cases">
            Letras maiúsculas <small>(ABC)</small>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="special-case"
            checked={config.useEspecialCharacters}
            onCheckedChange={(value) => {
              setConfig({ ...config, useEspecialCharacters: value });
            }}
          />
          <Label htmlFor="special-case">
            Caracteres especiais <small>(!@#$%^&)</small>
          </Label>
        </div>

        <Button className="w-full mt-4" onClick={createPass}>
          Gerar
        </Button>
      </div>
    </div>
  );
}
