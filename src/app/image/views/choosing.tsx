"use client";

import { useState, useEffect } from "react";
import {
  ImageDown, Scaling, Repeat2, BookImage, Eraser, PenTool, Palette as PaletteIcon,
} from "lucide-react";
import { type ImageMode } from "../types";
import { fmt } from "../helpers";
import { ActionCard, BackBtn } from "../shared";

const ACTIONS = [
  { mode: "compress"     as ImageMode, icon: <ImageDown size={20} />, title: "Comprimir",     desc: "Reduza o tamanho dos arquivos" },
  { mode: "resize"       as ImageMode, icon: <Scaling size={20} />,   title: "Redimensionar", desc: "Altere largura e altura" },
  { mode: "convert"      as ImageMode, icon: <Repeat2 size={20} />,   title: "Converter",     desc: "Mude o formato do arquivo" },
  { mode: "remove-bg"    as ImageMode, icon: <BookImage size={20} />, title: "Remover Fundo", desc: "IA — processado no dispositivo" },
  { mode: "remove-color" as ImageMode, icon: <Eraser size={20} />,    title: "Remover Cor",   desc: "Remove uma cor específica" },
  { mode: "vectorize"    as ImageMode, icon: <PenTool size={20} />,   title: "Vetorizar",     desc: "Converta para SVG monocromático" },
  { mode: "palette"      as ImageMode, icon: <PaletteIcon size={20} />, title: "Paleta",      desc: "Extraia as cores dominantes" },
];

export function ChoosingView({ file, onSelect, onBack }: {
  file: File; onSelect: (mode: ImageMode) => void; onBack: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onClick={onBack} />
      <div className="p-4 border rounded-xl bg-muted/30 flex items-center gap-3">
        {previewUrl
          ? <img src={previewUrl} alt="" className="h-16 w-16 object-cover rounded-lg border shrink-0" />
          : <div className="h-16 w-16 rounded-lg border shrink-0 bg-muted" />
        }
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{fmt(file.size)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">O que deseja fazer?</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ACTIONS.map(({ mode, icon, title, desc }) => (
          <ActionCard key={mode} icon={icon} title={title} desc={desc} onClick={() => onSelect(mode)} />
        ))}
      </div>
    </div>
  );
}
