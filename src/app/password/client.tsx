"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { generatePassword } from "@/lib/generate-password";
import { toast } from "sonner";

const CHARSET_OPTIONS = [
  { id: "useUppercase", label: "ABC", description: "Maiúsculas" },
  { id: "useSmallCase", label: "abc", description: "Minúsculas" },
  { id: "useNumbers", label: "123", description: "Números" },
  { id: "useEspecialCharacters", label: "!@#", description: "Especiais" },
] as const;

type ConfigKey = (typeof CHARSET_OPTIONS)[number]["id"];

function getStrength(pass: string, config: Record<string, boolean>): { score: number; label: string; color: string } {
  if (!pass || pass === "...") return { score: 0, label: "", color: "" };
  const activeCount = CHARSET_OPTIONS.filter((o) => config[o.id]).length;
  const len = pass.length;
  const score = Math.min(4, Math.floor((activeCount * len) / 16));
  const levels = [
    { label: "Fraca", color: "bg-red-500" },
    { label: "Razoável", color: "bg-orange-400" },
    { label: "Boa", color: "bg-yellow-400" },
    { label: "Forte", color: "bg-green-500" },
    { label: "Muito forte", color: "bg-emerald-500" },
  ];
  return { score, ...levels[score] };
}

export default function Page() {
  const [pass, setPass] = useState("...");
  const [config, setConfig] = useState<Record<string, boolean | number>>({
    size: 16,
    useEspecialCharacters: true,
    useNumbers: true,
    useUppercase: true,
    useSmallCase: true,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generated = generatePassword(config);
    setPass(generated || "...");
  }, [config]);

  const regenerate = () => {
    const generated = generatePassword(config);
    setPass(generated || "...");
  };

  const copyPassword = () => {
    if (!pass || pass === "...") return;
    navigator.clipboard.writeText(pass);
    toast.success("Senha copiada!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleOption = (key: ConfigKey) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const strength = getStrength(pass, config as Record<string, boolean>);
  const hasAnyCharset = CHARSET_OPTIONS.some((o) => config[o.id]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Password display */}
        <div
          onClick={copyPassword}
          className="group relative cursor-pointer rounded-2xl border bg-muted/50 p-5 transition-all hover:bg-muted active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className={`flex-1 truncate font-mono text-lg font-semibold tracking-wider transition-opacity ${!hasAnyCharset ? "opacity-30" : ""}`}>
              {pass}
            </p>
            <div className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
              {copied
                ? <ShieldCheck className="size-5 text-green-500" />
                : <Copy className="size-4" />}
            </div>
          </div>

          {/* Strength bar */}
          {hasAnyCharset && pass !== "..." && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength.score ? strength.color : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{strength.label}</span>
            </div>
          )}
        </div>

        {/* Size slider */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tamanho</span>
            <span className="w-8 text-right font-mono text-sm font-semibold text-primary">
              {config.size as number}
            </span>
          </div>
          <Slider
            min={4}
            max={64}
            step={1}
            value={[config.size as number]}
            onValueChange={([val]) => setConfig((prev) => ({ ...prev, size: val }))}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4</span>
            <span>64</span>
          </div>
        </div>

        {/* Charset toggles */}
        <div className="grid grid-cols-2 gap-2">
          {CHARSET_OPTIONS.map(({ id, label, description }) => {
            const active = !!config[id];
            return (
              <button
                key={id}
                onClick={() => toggleOption(id)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-95 ${
                  active
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                <span className={`font-mono text-sm font-bold ${active ? "text-primary" : ""}`}>
                  {label}
                </span>
                <span className="text-xs">{description}</span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={regenerate}
            className="shrink-0"
            title="Gerar nova senha"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={copyPassword}
            disabled={!hasAnyCharset}
          >
            {copied ? <ShieldCheck className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiada!" : "Copiar senha"}
          </Button>
        </div>

      </div>
    </div>
  );
}
