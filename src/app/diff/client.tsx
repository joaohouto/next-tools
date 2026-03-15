"use client";

import { useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type DiffLine = { type: "equal" | "add" | "remove"; line: string };

function diffLines(a: string[], b: string[]): DiffLine[] {
  const m = a.length, n = b.length;
  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Traceback
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "equal", line: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", line: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "remove", line: a[i - 1] });
      i--;
    }
  }
  return result;
}

const TYPE_STYLE: Record<DiffLine["type"], string> = {
  equal:  "bg-transparent text-foreground",
  add:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  remove: "bg-rose-500/10 text-rose-700 dark:text-rose-400 line-through",
};

const TYPE_GUTTER: Record<DiffLine["type"], string> = {
  equal:  "text-muted-foreground",
  add:    "text-emerald-600 font-bold",
  remove: "text-rose-600 font-bold",
};

const TYPE_SYMBOL: Record<DiffLine["type"], string> = {
  equal:  " ",
  add:    "+",
  remove: "−",
};

export default function TextDiff() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");

  const diff = useMemo(() => {
    if (!textA && !textB) return [];
    return diffLines(textA.split("\n"), textB.split("\n"));
  }, [textA, textB]);

  const stats = useMemo(() => ({
    added:   diff.filter((d) => d.type === "add").length,
    removed: diff.filter((d) => d.type === "remove").length,
    equal:   diff.filter((d) => d.type === "equal").length,
  }), [diff]);

  const copyDiff = async () => {
    const text = diff
      .map((d) => `${TYPE_SYMBOL[d.type]} ${d.line}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Diff copiado!");
  };

  const clear = () => { setTextA(""); setTextB(""); };

  const hasContent = textA || textB;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Texto A — original
            </Label>
            <Textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              placeholder="Cole o texto original aqui..."
              className="min-h-[240px] font-mono text-sm resize-none bg-background"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Texto B — modificado
            </Label>
            <Textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              placeholder="Cole o texto modificado aqui..."
              className="min-h-[240px] font-mono text-sm resize-none bg-background"
            />
          </div>
        </div>

        {/* Result */}
        {hasContent && (
          <div className="flex flex-col gap-4">

            {/* Stats + actions */}
            <div className="rounded-2xl border bg-muted/20 p-4 flex items-center gap-4 flex-wrap">
              <div className="flex gap-4 text-sm flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{stats.added}</span>
                  <span className="text-muted-foreground">adicionadas</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500" />
                  <span className="font-medium text-rose-700 dark:text-rose-400">{stats.removed}</span>
                  <span className="text-muted-foreground">removidas</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  <span className="font-medium">{stats.equal}</span>
                  <span className="text-muted-foreground">iguais</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clear}>
                  <Trash2 className="size-3.5" /> Limpar
                </Button>
                <Button variant="outline" size="sm" onClick={copyDiff}>
                  <Copy className="size-3.5" /> Copiar diff
                </Button>
              </div>
            </div>

            {/* Diff view */}
            <div className="rounded-2xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono border-collapse">
                  <tbody>
                    {diff.map((line, i) => (
                      <tr key={i} className={TYPE_STYLE[line.type]}>
                        <td className={`select-none px-3 py-0.5 text-xs border-r border-border/50 w-8 text-right ${TYPE_GUTTER[line.type]}`}>
                          {TYPE_SYMBOL[line.type]}
                        </td>
                        <td className="px-4 py-0.5 whitespace-pre">
                          {line.line || <span className="opacity-0">_</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
