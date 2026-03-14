"use client";

import { useRef, useState } from "react";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { copyImage, exportAsImage } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { IconPreview } from "./icon-preview";
import { IconSettings } from "./icon-settings";
import type { IconSource, IconConfig } from "./types";

const DEFAULT_SOURCE: IconSource = { type: "lucide", name: "Atom" };

const DEFAULT_CONFIG: IconConfig = {
  bgColor: "#111111",
  fgColor: "#FFFFFF",
  iconSize: 126,
  iconStrokeWidth: 1,
  iconRotation: 0,
  borderRadius: 0,
  imageSize: 512,
  format: "png",
  showGuidelines: false,
  customSVGCode: "",
};

export default function Page() {
  const [source, setSource] = useState<IconSource>(DEFAULT_SOURCE);
  const [config, setConfig] = useState<IconConfig>(DEFAULT_CONFIG);
  const imageRef = useRef<HTMLDivElement>(null);

  function updateConfig(partial: Partial<IconConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="w-screen h-screen p-3 flex flex-col gap-3 lg:flex-row lg:p-4">
      {/* Preview area */}
      <div className="h-[240px] lg:h-auto lg:flex-1 rounded-xl border overflow-hidden flex items-center justify-center bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px] relative">
        <IconPreview ref={imageRef} source={source} config={config} />
      </div>

      {/* Settings sidebar */}
      <div className="flex flex-col rounded-xl border overflow-hidden lg:w-[300px] lg:min-w-[300px] min-h-0">
        <IconSettings
          source={source}
          config={config}
          onSourceChange={setSource}
          onConfigChange={updateConfig}
        />

        {/* Export buttons */}
        <div className="shrink-0 grid grid-cols-2 gap-2 p-3 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyImage(
                imageRef.current,
                { canvasHeight: config.imageSize, canvasWidth: config.imageSize },
                config.format
              )
            }
          >
            <CopyIcon className="size-3.5" />
            Copiar
          </Button>
          <Button
            size="sm"
            onClick={() =>
              exportAsImage(
                imageRef.current,
                "icon",
                { canvasHeight: config.imageSize, canvasWidth: config.imageSize },
                config.format
              )
            }
          >
            <DownloadIcon className="size-3.5" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
