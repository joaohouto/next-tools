"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, Check, X, FileWarning, RotateCcw, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import FileDropzone from "@/components/file-dropzone";
import { Spinner } from "@/components/spinner";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type ConvertItem } from "./types";
import { type ConverterCategory, type TargetFormat } from "./lib/types";
import { ACCEPT_ALL, detectCategory, getModuleByCategory } from "./lib/registry";
import { ColumnHeader, ControlsBar, EmptyState } from "./shared";

const CATEGORY_LABELS: Record<ConverterCategory, string> = {
  image: "Imagens",
  pdf: "PDF",
  spreadsheet: "Planilhas",
  document: "Documentos",
  presentation: "Apresentações",
};

function newItem(file: File): ConvertItem {
  const category = detectCategory(file);
  return {
    id: `${file.name}-${Date.now()}-${Math.random()}`,
    file,
    category,
    previewUrl: category === "image" ? URL.createObjectURL(file) : undefined,
    status: "idle",
    results: [],
  };
}

export default function ConverterClient() {
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ConverterCategory | null>(null);
  const [targetFormat, setTargetFormat] = useState<TargetFormat | null>(null);
  const [processing, setProcessing] = useState(false);
  const [formatPickerOpen, setFormatPickerOpen] = useState(false);

  useEffect(() => () => {
    items.forEach((i) => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (files: File[]) => {
    const added = files.map(newItem);
    setItems((prev) => [...prev, ...added]);
    setActiveCategory((prev) => prev ?? added.find((i) => i.category)?.category ?? null);
  };

  const remove = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const reset = () => {
    items.forEach((i) => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
    setItems([]);
    setActiveCategory(null);
    setTargetFormat(null);
  };

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is ConverterCategory => c !== null)),
  );
  const categoryItems = items.filter((i) => i.category === activeCategory);
  const targets = activeCategory ? getModuleByCategory(activeCategory)?.getTargets(categoryItems.map((i) => i.file)) ?? [] : [];

  const selectCategory = (category: ConverterCategory) => {
    setActiveCategory(category);
    setTargetFormat(null);
  };

  const convertAll = async () => {
    if (!activeCategory || !targetFormat) return;
    const module = getModuleByCategory(activeCategory);
    if (!module) return;
    setProcessing(true);
    const inputs = categoryItems.map((i) => ({ id: i.id, file: i.file }));
    try {
      const results = await module.convert(inputs, targetFormat, (fileId, status) => {
        setItems((prev) => prev.map((i) => (i.id === fileId ? { ...i, status } : i)));
      });
      setItems((prev) => prev.map((i) => {
        const own = results.filter((r) => r.sourceFileId === i.id);
        return own.length ? { ...i, results: [...i.results, ...own] } : i;
      }));
      toast.success("Conversão concluída!");
    } catch {
      toast.error("Erro ao converter os arquivos.");
    } finally {
      setProcessing(false);
    }
  };

  const allResults = items.flatMap((i) => i.results.map((r) => ({ ...r, sourceName: i.file.name })));

  const downloadResult = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)] items-start">
          {/* Coluna 1 — entrada */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <ColumnHeader>Arquivos</ColumnHeader>
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw size={14} /> Limpar tudo
                </Button>
              )}
            </div>
            <FileDropzone onUpload={addFiles} accept={ACCEPT_ALL} multiple
              title="Arraste ou clique para enviar" label="Imagens, PDF e mais" />
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt="" className="h-10 w-10 object-cover rounded border shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                      {item.category ? (
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {item.file.name.split(".").pop()}
                        </span>
                      ) : (
                        <FileWarning size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category ? formatBytes(item.file.size) : "Formato não suportado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "processing" && <Spinner className="size-3.5" />}
                    {item.status === "done" && <Check size={14} className="text-green-500" />}
                    {item.status === "error" && <X size={14} className="text-red-500" />}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(item.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2 — formato de destino */}
          <div className="flex flex-col gap-3">
            <ColumnHeader>Converter para</ColumnHeader>
            {items.length === 0 ? (
              <EmptyState>Envie arquivos para escolher o formato de destino.</EmptyState>
            ) : (
              <ControlsBar>
                {categories.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <button key={c} onClick={() => selectCategory(c)}
                        className={cn(
                          "px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                          activeCategory === c ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/40",
                        )}>
                        {CATEGORY_LABELS[c]} ({items.filter((i) => i.category === c).length})
                      </button>
                    ))}
                  </div>
                )}

                {targets.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formato</Label>
                    <Popover open={formatPickerOpen} onOpenChange={setFormatPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={formatPickerOpen}
                          className="w-full justify-between font-normal"
                        >
                          {targetFormat ? targetFormat.label : "Selecione um formato…"}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar formato..." />
                          <CommandList>
                            <CommandEmpty>Nenhum formato encontrado.</CommandEmpty>
                            <CommandGroup>
                              {targets.map((t) => (
                                <CommandItem
                                  key={t.id}
                                  value={t.label}
                                  onSelect={() => {
                                    setTargetFormat(t);
                                    setFormatPickerOpen(false);
                                  }}
                                >
                                  <Check className={cn(targetFormat?.id === t.id ? "opacity-100" : "opacity-0")} />
                                  {t.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {targetFormat?.limited && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        Conversão limitada — pode não preservar toda a formatação original.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum destino disponível para este tipo de arquivo.</p>
                )}

                <Button size="sm" onClick={convertAll} disabled={processing || !targetFormat || categoryItems.length === 0}>
                  {processing && <Spinner className="size-3.5" />}
                  Converter
                </Button>
              </ControlsBar>
            )}
          </div>

          {/* Coluna 3 — resultado */}
          <div className="flex flex-col gap-3">
            <ColumnHeader>Convertidos</ColumnHeader>
            {allResults.length === 0 ? (
              <EmptyState>Os arquivos convertidos aparecem aqui.</EmptyState>
            ) : (
              <>
                <Button size="sm" onClick={() => allResults.forEach((r) => downloadResult(r.blob, r.name))}>
                  <Download size={14} /> Baixar tudo ({allResults.length})
                </Button>
                <div className="flex flex-col gap-2">
                  {allResults.map((r, idx) => (
                    <div key={`${r.sourceFileId}-${r.name}-${idx}`} className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(r.blob.size)} · de {r.sourceName}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => downloadResult(r.blob, r.name)}>
                        <Download size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
