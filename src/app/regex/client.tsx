"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, RotateCcw, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { REGEX_PRESETS } from "./presets";
import { CHEATSHEET_GROUPS } from "./cheatsheet";

const FLAG_OPTIONS: { flag: string; label: string; description: string }[] = [
  { flag: "g", label: "g", description: "Global — todas as ocorrências" },
  { flag: "i", label: "i", description: "Ignora maiúsculas/minúsculas" },
  { flag: "m", label: "m", description: "Multilinha (^ e $ por linha)" },
  { flag: "s", label: "s", description: "Dotall — . inclui quebras de linha" },
  { flag: "u", label: "u", description: "Unicode" },
  { flag: "y", label: "y", description: "Sticky — a partir de lastIndex" },
];

interface MatchGroup {
  name: string;
  value: string | undefined;
}
interface MatchResult {
  index: number;
  match: string;
  groups: MatchGroup[];
}
interface Segment {
  text: string;
  matched: boolean;
}

function toMatchResult(m: RegExpMatchArray | RegExpExecArray): MatchResult {
  const groups: MatchGroup[] = [];
  for (let i = 1; i < m.length; i++) {
    groups.push({ name: String(i), value: m[i] });
  }
  if (m.groups) {
    for (const [name, value] of Object.entries(m.groups)) {
      groups.push({ name, value });
    }
  }
  return { index: m.index ?? 0, match: m[0], groups };
}

export default function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [testString, setTestString] = useState("");
  const patternRef = useRef<HTMLInputElement>(null);

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null as RegExp | null, error: null as string | null };
    try {
      return { regex: new RegExp(pattern, flags), error: null };
    } catch (e) {
      return { regex: null, error: e instanceof Error ? e.message : "Padrão inválido" };
    }
  }, [pattern, flags]);

  const matches = useMemo<MatchResult[]>(() => {
    if (!regex || !testString) return [];
    const results: MatchResult[] = [];
    if (flags.includes("g")) {
      for (const m of testString.matchAll(regex)) {
        results.push(toMatchResult(m));
        if (results.length >= 1000) break;
      }
    } else {
      const m = regex.exec(testString);
      if (m) results.push(toMatchResult(m));
    }
    return results;
  }, [regex, testString, flags]);

  const segments = useMemo<Segment[]>(() => {
    if (!testString) return [];
    if (matches.length === 0) return [{ text: testString, matched: false }];
    const segs: Segment[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) segs.push({ text: testString.slice(cursor, m.index), matched: false });
      segs.push({ text: m.match, matched: true });
      cursor = Math.max(cursor, m.index + m.match.length);
    }
    if (cursor < testString.length) segs.push({ text: testString.slice(cursor), matched: false });
    return segs;
  }, [testString, matches]);

  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, "") : prev + f));
  };

  const insertToken = (token: string) => {
    const input = patternRef.current;
    if (!input) { setPattern((p) => p + token); return; }
    const start = input.selectionStart ?? pattern.length;
    const end = input.selectionEnd ?? pattern.length;
    const next = pattern.slice(0, start) + token + pattern.slice(end);
    setPattern(next);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + token.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const loadPreset = (preset: (typeof REGEX_PRESETS)[number]) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestString(preset.sample);
    toast.success(`Preset "${preset.label}" carregado`);
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const clear = () => { setPattern(""); setTestString(""); };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Pattern + flags */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Padrão</Label>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center rounded-md border bg-background pl-2 focus-within:ring-1 focus-within:ring-ring">
              <span className="text-muted-foreground font-mono text-sm select-none">/</span>
              <Input
                ref={patternRef}
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="seu-padrão-aqui"
                className="border-0 shadow-none focus-visible:ring-0 font-mono"
              />
              <span className="text-muted-foreground font-mono text-sm select-none pr-2">/{flags}</span>
            </div>
            <Button variant="outline" size="icon" onClick={clear} title="Limpar">
              <RotateCcw className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FLAG_OPTIONS.map(({ flag, label, description }) => (
              <button
                key={flag}
                title={description}
                onClick={() => toggleFlag(flag)}
                className={cn(
                  "rounded-md border h-7 w-7 text-xs font-mono font-medium transition-all active:scale-95",
                  flags.includes(flag)
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-[1fr_260px] gap-6">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Test string */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Texto de teste
              </Label>
              <Textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="Cole o texto para testar o padrão..."
                className="min-h-[140px] font-mono text-sm resize-none bg-background"
              />
            </div>

            {/* Highlighted preview */}
            {testString && (
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  {regex ? `${matches.length} correspondência${matches.length !== 1 ? "s" : ""}` : "Aguardando padrão válido"}
                </p>
                <p className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {segments.map((seg, i) =>
                    seg.matched ? (
                      <mark key={i} className="bg-primary/25 text-foreground rounded px-0.5">{seg.text}</mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    ),
                  )}
                </p>
              </div>
            )}

            {/* Matches list */}
            {matches.length > 0 && (
              <div className="rounded-2xl border overflow-hidden">
                <div className="divide-y">
                  {matches.map((m, i) => (
                    <div key={i} className="p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Match {i + 1} · índice {m.index}
                        </span>
                        <button
                          onClick={() => copyText(m.match, "Match")}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <p className="font-mono text-sm break-all">
                        {m.match || <span className="italic text-muted-foreground">(vazio)</span>}
                      </p>
                      {m.groups.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1 pl-3 border-l-2 border-border">
                          {m.groups.map((g, gi) => (
                            <div key={gi} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground shrink-0">{g.name}:</span>
                              <span className="font-mono truncate">{g.value ?? <span className="italic">—</span>}</span>
                              {g.value !== undefined && (
                                <button
                                  onClick={() => copyText(g.value!, `Grupo ${g.name}`)}
                                  className="text-muted-foreground hover:text-foreground shrink-0"
                                >
                                  <Copy size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side panel: presets + cheatsheet */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold mb-3">Presets</p>
              <div className="flex flex-col gap-1">
                {REGEX_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadPreset(p)}
                    className="text-left text-xs rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                    title={p.description}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold mb-3">Cheatsheet</p>
              <div className="flex flex-col gap-3">
                {CHEATSHEET_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">{group.title}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.tokens.map((t) => (
                        <button
                          key={t.token}
                          onClick={() => insertToken(t.token)}
                          title={t.description}
                          className="rounded-md border px-1.5 py-1 text-xs font-mono border-border bg-background hover:bg-muted transition-all active:scale-95"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
