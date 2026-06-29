"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { type ImageMode } from "./types";
import { ImageDropZone } from "./shared";
import { ChoosingView } from "./views/choosing";
import { CompressView } from "./views/compress";
import { ResizeView } from "./views/resize";
import { ConvertView } from "./views/convert";
import { RemoveBgView } from "./views/remove-bg";
import { RemoveColorView } from "./views/remove-color";
import { VectorizeView } from "./views/vectorize";
import { PaletteView } from "./views/palette";

export default function ImageTool() {
  const [mode, setMode] = useState<ImageMode>("idle");
  const [files, setFiles] = useState<File[]>([]);

  const reset = () => { setMode("idle"); setFiles([]); };
  // When coming back from a tool, return to choosing if there's a single file in context,
  // otherwise go to idle (multiple files were dropped directly into compress/convert).
  const goBack = () => { if (files.length === 1) setMode("choosing"); else reset(); };

  const handleDrop = useCallback((dropped: File[]) => {
    const imgs = dropped.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setFiles(imgs);
    setMode(imgs.length === 1 ? "choosing" : "compress");
  }, []);

  const goMode = (m: ImageMode) => setMode(m);

  return (
    <div className={cn("p-8 w-full min-h-screen", mode === "idle" && "flex items-center justify-center")}>
      <div className={cn("w-full mx-auto", mode === "idle" ? "max-w-md" : "md:max-w-[680px]")}>
        {mode === "idle"         && <ImageDropZone onFiles={handleDrop} />}
        {mode === "choosing"     && <ChoosingView file={files[0]} onSelect={goMode} onBack={reset} />}
        {mode === "compress"     && <CompressView initialFiles={files} onBack={goBack} />}
        {mode === "resize"       && <ResizeView file={files[0]} onBack={goBack} />}
        {mode === "convert"      && <ConvertView initialFiles={files} onBack={goBack} />}
        {mode === "remove-bg"    && <RemoveBgView file={files[0]} onBack={goBack} />}
        {mode === "remove-color" && <RemoveColorView file={files[0]} onBack={goBack} />}
        {mode === "vectorize"    && <VectorizeView file={files[0]} onBack={goBack} />}
        {mode === "palette"      && <PaletteView file={files[0]} onBack={goBack} />}
      </div>
    </div>
  );
}
