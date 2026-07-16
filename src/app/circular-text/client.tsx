"use client";

import { useRef, useState } from "react";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { copySvgElement, exportSvgElement } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { CircularTextPreview } from "./circular-text-preview";
import { CircularTextSettings } from "./circular-text-settings";
import type { CircularTextConfig } from "./types";

const DEFAULT_CONFIG: CircularTextConfig = {
  text: "TEXTO CIRCULAR • FEITO NO NAVEGADOR • ",
  fontFamily: "Inter",
  fontWeight: 600,
  fontSize: 32,
  letterSpacing: 4,
  radius: 150,
  anchorAngle: 0,
  align: "center",
  flip: false,
  squareCanvas: false,
  color: "#111111",
  bgColor: "transparent",
  unit: "px",
};

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function Page() {
  const [config, setConfig] = useState<CircularTextConfig>(DEFAULT_CONFIG);
  const [overflowWarning, setOverflowWarning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  function updateConfig(partial: Partial<CircularTextConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="w-screen h-screen p-3 flex flex-col gap-3 lg:flex-row lg:p-4">
      {/* Preview area */}
      <div className="h-[320px] lg:h-auto lg:flex-1 rounded-xl border overflow-hidden flex items-center justify-center bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px] relative">
        <CircularTextPreview
          ref={svgRef}
          config={config}
          onOverflowChange={setOverflowWarning}
        />
      </div>

      {/* Settings sidebar */}
      <div className="flex flex-col rounded-xl border overflow-hidden lg:w-[350px] lg:min-w-[350px] min-h-0">
        <CircularTextSettings
          config={config}
          onConfigChange={updateConfig}
          overflowWarning={overflowWarning}
        />

        {/* Export buttons */}
        <div className="shrink-0 grid grid-cols-2 gap-2 p-3 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copySvgElement(svgRef.current)}
          >
            <CopyIcon className="size-3.5" />
            Copiar SVG
          </Button>
          <Button
            size="sm"
            onClick={() =>
              exportSvgElement(svgRef.current, normalizeText(config.text))
            }
          >
            <DownloadIcon className="size-3.5" />
            Baixar SVG
          </Button>
        </div>
      </div>
    </div>
  );
}
