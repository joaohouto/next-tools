"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Printer,
  FileDown,
  Settings2,
  BookOpen,
  AlignJustify,
  Grid3X3,
  Music,
  Triangle,
  FileText,
  Columns,
  Minus,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb } from "pdf-lib";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type LineType =
  | "ruled"
  | "dotted"
  | "grid"
  | "isometric"
  | "cornell"
  | "music"
  | "blank";

type PaperSize = "a4" | "a5" | "letter" | "half-letter";
type Orientation = "portrait" | "landscape";

interface Config {
  lineType: LineType;
  paperSize: PaperSize;
  orientation: Orientation;
  lineSpacingMm: number;
  lineColor: string;
  lineOpacity: number;
  showBorder: boolean;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  bindingMarginMm: number;
  doubleSided: boolean;
  pageCount: number;
  showPageNumbers: boolean;
  showDate: boolean;
  dateText: string;
  headerText: string;
  footerText: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const PAPER_SIZES: Record<
  PaperSize,
  { w: number; h: number; label: string }
> = {
  a4: { w: 210, h: 297, label: "A4 (210 × 297mm)" },
  a5: { w: 148, h: 210, label: "A5 (148 × 210mm)" },
  letter: { w: 215.9, h: 279.4, label: 'Letter (8.5 × 11")' },
  "half-letter": { w: 139.7, h: 215.9, label: 'Half Letter (5.5 × 8.5")' },
};

const LINE_TYPES: {
  value: LineType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultSpacing: number;
}[] = [
  {
    value: "ruled",
    label: "Pautado",
    description: "Linhas horizontais clássicas",
    icon: <AlignJustify className="w-4 h-4" />,
    defaultSpacing: 7,
  },
  {
    value: "dotted",
    label: "Pontilhado",
    description: "Grade de pontos (Bullet Journal)",
    icon: <Grid3X3 className="w-4 h-4" />,
    defaultSpacing: 5,
  },
  {
    value: "grid",
    label: "Quadriculado",
    description: "Papel milimetrado / grade",
    icon: <Grid3X3 className="w-4 h-4" />,
    defaultSpacing: 5,
  },
  {
    value: "isometric",
    label: "Isométrico",
    description: "Grade triangular para esboços 3D",
    icon: <Triangle className="w-4 h-4" />,
    defaultSpacing: 7,
  },
  {
    value: "cornell",
    label: "Cornell",
    description: "Coluna de notas + área de resumo",
    icon: <Columns className="w-4 h-4" />,
    defaultSpacing: 7,
  },
  {
    value: "music",
    label: "Pauta Musical",
    description: "5 linhas para notação musical",
    icon: <Music className="w-4 h-4" />,
    defaultSpacing: 15,
  },
  {
    value: "blank",
    label: "Em Branco",
    description: "Sem pauta – apenas margens",
    icon: <FileText className="w-4 h-4" />,
    defaultSpacing: 7,
  },
];

const LINE_COLORS = [
  { label: "Azul Caderno", value: "#c8d6e5" },
  { label: "Cinza Claro", value: "#d1d5db" },
  { label: "Azul Claro", value: "#bfdbfe" },
  { label: "Verde Claro", value: "#bbf7d0" },
  { label: "Sépia", value: "#d4b483" },
  { label: "Rosa", value: "#fce7f3" },
  { label: "Roxo", value: "#e9d5ff" },
  { label: "Escuro", value: "#374151" },
];

const DEFAULT_CONFIG: Config = {
  lineType: "ruled",
  paperSize: "a4",
  orientation: "portrait",
  lineSpacingMm: 7,
  lineColor: "#c8d6e5",
  lineOpacity: 100,
  showBorder: false,
  marginTopMm: 15,
  marginBottomMm: 15,
  marginLeftMm: 20,
  marginRightMm: 15,
  bindingMarginMm: 10,
  doubleSided: false,
  pageCount: 1,
  showPageNumbers: false,
  showDate: false,
  dateText: "",
  headerText: "",
  footerText: "",
};

const MM_TO_PT = 72 / 25.4;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

function hexToRgba(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${opacity})`;
}

/** Liang–Barsky line-rectangle clipping. Returns null if segment is fully outside. */
function clipSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
): [number, number, number, number] | null {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;

  const edge = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > tMax) return false;
      if (r > tMin) tMin = r;
    } else {
      if (r < tMin) return false;
      if (r < tMax) tMax = r;
    }
    return true;
  };

  if (
    !edge(-dx, ax - xMin) ||
    !edge(dx, xMax - ax) ||
    !edge(-dy, ay - yMin) ||
    !edge(dy, yMax - ay)
  )
    return null;

  if (tMin > tMax) return null;

  return [ax + tMin * dx, ay + tMin * dy, ax + tMax * dx, ay + tMax * dy];
}

function getPageDimensions(config: Config) {
  const paper = PAPER_SIZES[config.paperSize];
  return config.orientation === "portrait"
    ? { widthMm: paper.w, heightMm: paper.h }
    : { widthMm: paper.h, heightMm: paper.w };
}

function getMargins(config: Config, pageNum: number) {
  const isOdd = pageNum % 2 === 1;
  return {
    left:
      config.doubleSided && isOdd
        ? config.marginLeftMm + config.bindingMarginMm
        : config.marginLeftMm,
    right:
      config.doubleSided && !isOdd
        ? config.marginRightMm + config.bindingMarginMm
        : config.marginRightMm,
    top: config.marginTopMm,
    bottom: config.marginBottomMm,
  };
}

// ─────────────────────────────────────────────
// SVG LINE RENDERER
// ─────────────────────────────────────────────
function renderSVGContent(
  config: Config,
  widthMm: number,
  heightMm: number,
  pageNum: number
): React.ReactNode {
  const m = getMargins(config, pageNum);
  const cx1 = m.left;
  const cx2 = widthMm - m.right;
  const cy1 = m.top;
  const cy2 = heightMm - m.bottom;
  const s = config.lineSpacingMm;
  const stroke = hexToRgba(config.lineColor, config.lineOpacity / 100);
  const sw = 0.25; // stroke-width in mm
  const clipId = `clip-${pageNum}`;

  const lineEls: React.ReactNode[] = [];
  const dotEls: React.ReactNode[] = [];

  if (config.lineType === "ruled") {
    for (let y = cy1 + s; y <= cy2 + 0.001; y += s) {
      lineEls.push(
        <line
          key={y.toFixed(3)}
          x1={cx1}
          y1={y}
          x2={cx2}
          y2={y}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }
  } else if (config.lineType === "dotted") {
    for (let y = cy1 + s; y <= cy2 + 0.001; y += s) {
      for (let x = cx1 + s; x <= cx2 + 0.001; x += s) {
        dotEls.push(
          <circle
            key={`${x.toFixed(2)}-${y.toFixed(2)}`}
            cx={x}
            cy={y}
            r={0.3}
            fill={stroke}
          />
        );
      }
    }
  } else if (config.lineType === "grid") {
    for (let y = cy1 + s; y <= cy2 + 0.001; y += s) {
      lineEls.push(
        <line
          key={`h${y.toFixed(3)}`}
          x1={cx1}
          y1={y}
          x2={cx2}
          y2={y}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }
    for (let x = cx1 + s; x <= cx2 + 0.001; x += s) {
      lineEls.push(
        <line
          key={`v${x.toFixed(3)}`}
          x1={x}
          y1={cy1}
          x2={x}
          y2={cy2}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }
  } else if (config.lineType === "isometric") {
    const slope = Math.sqrt(3);
    const diagStep = (2 * s) / slope;
    const contentH = cy2 - cy1;
    const ext = contentH / slope + s;

    // Horizontal lines
    for (let y = cy1 + s; y <= cy2 + 0.001; y += s) {
      lineEls.push(
        <line
          key={`h${y.toFixed(3)}`}
          x1={cx1}
          y1={y}
          x2={cx2}
          y2={y}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }

    // Right-leaning diagonals (↘): y = cy1 + (x - x0) * slope
    for (
      let x0 = cx1 - ext;
      x0 <= cx2 + diagStep;
      x0 += diagStep
    ) {
      lineEls.push(
        <line
          key={`dr${x0.toFixed(2)}`}
          x1={x0 - ext}
          y1={cy1 - ext * slope}
          x2={x0 + ext}
          y2={cy1 + ext * slope}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }

    // Left-leaning diagonals (↙): y = cy1 + (x0 - x) * slope
    for (
      let x0 = cx1 - diagStep;
      x0 <= cx2 + ext;
      x0 += diagStep
    ) {
      lineEls.push(
        <line
          key={`dl${x0.toFixed(2)}`}
          x1={x0 + ext}
          y1={cy1 - ext * slope}
          x2={x0 - ext}
          y2={cy1 + ext * slope}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }
  } else if (config.lineType === "cornell") {
    const cueW = Math.min(50, (cx2 - cx1) * 0.32);
    const cueX = cx1 + cueW;
    const summaryH = Math.min(50, (cy2 - cy1) * 0.18);
    const summaryY = cy2 - summaryH;
    const structSw = sw * 2.5;

    // Horizontal ruled lines across full width
    for (let y = cy1 + s; y <= cy2 + 0.001; y += s) {
      lineEls.push(
        <line
          key={`h${y.toFixed(3)}`}
          x1={cx1}
          y1={y}
          x2={cx2}
          y2={y}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }

    // Cue column vertical line
    lineEls.push(
      <line
        key="cue"
        x1={cueX}
        y1={cy1}
        x2={cueX}
        y2={summaryY}
        stroke={stroke}
        strokeWidth={structSw}
      />
    );

    // Summary area horizontal line
    lineEls.push(
      <line
        key="summary"
        x1={cx1}
        y1={summaryY}
        x2={cx2}
        y2={summaryY}
        stroke={stroke}
        strokeWidth={structSw}
      />
    );

    // Cornell labels (faint)
    const labelColor = hexToRgba(config.lineColor, (config.lineOpacity / 100) * 0.45);
    lineEls.push(
      <text
        key="label-cue"
        x={cx1 + 1}
        y={cy1 + 4}
        fontSize={3}
        fill={labelColor}
        fontFamily="sans-serif"
      >
        Palavras-chave
      </text>
    );
    lineEls.push(
      <text
        key="label-notes"
        x={cueX + 2}
        y={cy1 + 4}
        fontSize={3}
        fill={labelColor}
        fontFamily="sans-serif"
      >
        Notas
      </text>
    );
    lineEls.push(
      <text
        key="label-summary"
        x={cx1 + 1}
        y={summaryY + 4}
        fontSize={3}
        fill={labelColor}
        fontFamily="sans-serif"
      >
        Resumo
      </text>
    );
  } else if (config.lineType === "music") {
    const staffInner = 2; // mm between lines within a staff
    const staffH = staffInner * 4; // height of 5-line staff
    let y0 = cy1 + s;
    while (y0 + staffH <= cy2 + 0.001) {
      for (let i = 0; i < 5; i++) {
        const y = y0 + i * staffInner;
        lineEls.push(
          <line
            key={`st${y0.toFixed(2)}-${i}`}
            x1={cx1}
            y1={y}
            x2={cx2}
            y2={y}
            stroke={stroke}
            strokeWidth={sw}
          />
        );
      }
      y0 += staffH + s;
    }
  }

  const hasClip =
    config.lineType === "isometric" ||
    config.lineType === "dotted" ||
    config.lineType === "grid" ||
    config.lineType === "cornell";

  const textColor = hexToRgba(config.lineColor, (config.lineOpacity / 100) * 0.55);
  const textFontSize = 3.2;

  // Header/footer positions: only render if there's margin space; clamp to safe zone
  const headerY = Math.max(4, m.top * 0.65);
  const footerY = Math.min(heightMm - 1, heightMm - m.bottom * 0.3);

  const dateLabel = config.dateText.trim() || "Data: ____/____/________";

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={cx1} y={cy1} width={cx2 - cx1} height={cy2 - cy1} />
        </clipPath>
      </defs>

      {/* Line pattern */}
      <g clipPath={hasClip ? `url(#${clipId})` : undefined}>
        {lineEls}
        {dotEls}
      </g>

      {/* Border around content area */}
      {config.showBorder && (
        <rect
          x={cx1}
          y={cy1}
          width={cx2 - cx1}
          height={cy2 - cy1}
          stroke={stroke}
          strokeWidth={sw * 2}
          fill="none"
        />
      )}

      {/* Header text */}
      {config.headerText && (
        <text
          x={cx1}
          y={headerY}
          fontSize={textFontSize}
          fill={textColor}
          fontFamily="sans-serif"
        >
          {config.headerText}
        </text>
      )}

      {/* Date field */}
      {config.showDate && (
        <text
          x={cx2}
          y={headerY}
          textAnchor="end"
          fontSize={textFontSize}
          fill={textColor}
          fontFamily="sans-serif"
        >
          {dateLabel}
        </text>
      )}

      {/* Footer text */}
      {config.footerText && (
        <text
          x={cx1}
          y={footerY}
          fontSize={textFontSize}
          fill={textColor}
          fontFamily="sans-serif"
        >
          {config.footerText}
        </text>
      )}

      {/* Page number */}
      {config.showPageNumbers && (
        <text
          x={widthMm / 2}
          y={footerY}
          textAnchor="middle"
          fontSize={textFontSize}
          fill={textColor}
          fontFamily="sans-serif"
        >
          {pageNum}
        </text>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────
async function exportPDF(config: Config): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const { widthMm, heightMm } = getPageDimensions(config);
  const wPt = widthMm * MM_TO_PT;
  const hPt = heightMm * MM_TO_PT;

  const { r, g, b } = hexToRgb(config.lineColor);
  const lineColor = rgb(r, g, b);
  const opacity = config.lineOpacity / 100;
  const thickness = 0.5;

  for (let pageNum = 1; pageNum <= config.pageCount; pageNum++) {
    const m = getMargins(config, pageNum);
    // pdf-lib: y=0 at bottom, y increases upward
    const lPt = m.left * MM_TO_PT;
    const rPt = (widthMm - m.right) * MM_TO_PT;
    const topPt = (heightMm - m.top) * MM_TO_PT;
    const botPt = m.bottom * MM_TO_PT;
    const sPt = config.lineSpacingMm * MM_TO_PT;

    const page = pdfDoc.addPage([wPt, hPt]);

    const dl = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      t = thickness
    ) => {
      page.drawLine({
        start: { x: ax, y: ay },
        end: { x: bx, y: by },
        thickness: t,
        color: lineColor,
        opacity,
      });
    };

    const dd = (x: number, y: number) => {
      page.drawCircle({ x, y, size: 0.5, color: lineColor, opacity });
    };

    switch (config.lineType) {
      case "ruled": {
        for (let y = topPt - sPt; y >= botPt - 0.01; y -= sPt) {
          dl(lPt, y, rPt, y);
        }
        break;
      }
      case "dotted": {
        for (let y = topPt - sPt; y >= botPt - 0.01; y -= sPt) {
          for (let x = lPt + sPt; x <= rPt + 0.01; x += sPt) {
            dd(x, y);
          }
        }
        break;
      }
      case "grid": {
        for (let y = topPt - sPt; y >= botPt - 0.01; y -= sPt) {
          dl(lPt, y, rPt, y);
        }
        for (let x = lPt + sPt; x <= rPt + 0.01; x += sPt) {
          dl(x, topPt, x, botPt);
        }
        break;
      }
      case "isometric": {
        const slope = Math.sqrt(3);
        const diagStep = (2 * sPt) / slope;
        const contentHPt = topPt - botPt;

        // Horizontal lines
        for (let y = topPt - sPt; y >= botPt - 0.01; y -= sPt) {
          dl(lPt, y, rPt, y);
        }

        // Right-leaning diagonals (↘): in PDF y-up coords, as x↑ → y↓
        // Line from (x0, topPt) going right-down: y = topPt - (x - x0)*slope
        for (
          let x0 = lPt - contentHPt / slope;
          x0 <= rPt + diagStep;
          x0 += diagStep
        ) {
          const seg = clipSegment(
            x0,
            topPt,
            x0 + contentHPt / slope + 1,
            botPt - 1,
            lPt,
            botPt,
            rPt,
            topPt
          );
          if (seg) dl(seg[0], seg[1], seg[2], seg[3]);
        }

        // Left-leaning diagonals (↙): as x↑ → y↑ (in PDF)
        for (
          let x0 = lPt - diagStep;
          x0 <= rPt + contentHPt / slope + diagStep;
          x0 += diagStep
        ) {
          const seg = clipSegment(
            x0,
            topPt,
            x0 - contentHPt / slope - 1,
            botPt - 1,
            lPt,
            botPt,
            rPt,
            topPt
          );
          if (seg) dl(seg[0], seg[1], seg[2], seg[3]);
        }
        break;
      }
      case "cornell": {
        const cueWPt = Math.min(50, (rPt - lPt) * 0.32) * MM_TO_PT;
        const cueXPt = lPt + cueWPt;
        const summaryHPt = Math.min(50, (topPt - botPt) * 0.18) * MM_TO_PT;
        const summaryYPt = botPt + summaryHPt;

        for (let y = topPt - sPt; y >= botPt - 0.01; y -= sPt) {
          dl(lPt, y, rPt, y);
        }
        dl(cueXPt, summaryYPt, cueXPt, topPt, thickness * 2);
        dl(lPt, summaryYPt, rPt, summaryYPt, thickness * 2);
        break;
      }
      case "music": {
        const staffInnerPt = 2 * MM_TO_PT;
        const staffHPt = staffInnerPt * 4;
        let y0 = topPt - sPt;
        while (y0 - staffHPt >= botPt - 0.01) {
          for (let i = 0; i < 5; i++) {
            dl(lPt, y0 - i * staffInnerPt, rPt, y0 - i * staffInnerPt);
          }
          y0 -= staffHPt + sPt;
        }
        break;
      }
      case "blank":
      default:
        break;
    }

    // Border around content area
    if (config.showBorder) {
      page.drawRectangle({
        x: lPt,
        y: botPt,
        width: rPt - lPt,
        height: topPt - botPt,
        borderColor: lineColor,
        borderWidth: 1,
        borderOpacity: opacity,
        opacity: 0,
      });
    }

    // Header / footer text (using built-in Helvetica)
    const font = await pdfDoc.embedFont("Helvetica");
    const textColor = rgb(r * 0.6, g * 0.6, b * 0.6);
    const textSize = 9;
    const textOp = opacity * 0.6;
    const headerYPt = topPt + 4;
    const footerYPt = botPt - 12;

    if (config.headerText) {
      page.drawText(config.headerText, {
        x: lPt,
        y: headerYPt,
        size: textSize,
        font,
        color: textColor,
        opacity: textOp,
      });
    }

    if (config.showDate) {
      const dateLabel = config.dateText.trim() || "Data: ____/____/________";
      const dateW = font.widthOfTextAtSize(dateLabel, textSize);
      page.drawText(dateLabel, {
        x: rPt - dateW,
        y: headerYPt,
        size: textSize,
        font,
        color: textColor,
        opacity: textOp,
      });
    }

    if (config.footerText) {
      page.drawText(config.footerText, {
        x: lPt,
        y: footerYPt,
        size: textSize,
        font,
        color: textColor,
        opacity: textOp,
      });
    }

    if (config.showPageNumbers) {
      const pageStr = String(pageNum);
      const textW = font.widthOfTextAtSize(pageStr, textSize);
      page.drawText(pageStr, {
        x: wPt / 2 - textW / 2,
        y: footerYPt,
        size: textSize,
        font,
        color: textColor,
        opacity: textOp,
      });
    }
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "folha-pautada.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// PRINT CSS GENERATOR
// ─────────────────────────────────────────────
function buildPrintCSS(config: Config): string {
  const { widthMm, heightMm } = getPageDimensions(config);
  const orientation =
    config.orientation === "landscape" ? "landscape" : "portrait";

  let doubleSidedCSS = "";
  if (config.doubleSided) {
    doubleSidedCSS = `
      @page :left {
        margin-left: ${config.marginRightMm}mm;
        margin-right: ${config.marginRightMm + config.bindingMarginMm}mm;
      }
      @page :right {
        margin-left: ${config.marginLeftMm + config.bindingMarginMm}mm;
        margin-right: ${config.marginRightMm}mm;
      }
    `;
  }

  return `
    @media print {
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }
      #print-area {
        position: absolute;
        left: 0;
        top: 0;
        margin: 0;
        padding: 0;
      }
      .print-page {
        width: ${widthMm}mm;
        height: ${heightMm}mm;
        page-break-after: always;
        position: relative;
        overflow: hidden;
        background: white;
        box-shadow: none;
        border: none;
      }
      .print-page svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      @page {
        size: ${widthMm}mm ${heightMm}mm ${orientation};
        margin: 0;
      }
      ${doubleSidedCSS}
    }
  `;
}

// ─────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────
function SheetPage({
  config,
  pageNum,
  widthMm,
  heightMm,
}: {
  config: Config;
  pageNum: number;
  widthMm: number;
  heightMm: number;
}) {
  return (
    <div
      className="print-page relative bg-white"
      style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
    >
      <svg
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {renderSVGContent(config, widthMm, heightMm, pageNum)}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────
function SettingsPanel({
  config,
  onChange,
}: {
  config: Config;
  onChange: (updates: Partial<Config>) => void;
}) {
  const [marginsOpen, setMarginsOpen] = useState(false);
  const [headerFooterOpen, setHeaderFooterOpen] = useState(true);

  return (
    <div className="space-y-4">
      {/* LINE STYLE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlignJustify className="w-4 h-4" />
            Tipo de Pauta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {LINE_TYPES.map((lt) => (
              <button
                key={lt.value}
                onClick={() =>
                  onChange({
                    lineType: lt.value,
                    lineSpacingMm: lt.defaultSpacing,
                  })
                }
                className={`text-left rounded-lg border px-2.5 py-2 text-xs transition-all hover:border-primary/60 hover:bg-primary/5 ${
                  config.lineType === lt.value
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {lt.icon}
                  <span className="font-medium">{lt.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {lt.description}
                </p>
              </button>
            ))}
          </div>

          {config.lineType !== "blank" && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">
                    {config.lineType === "music"
                      ? "Espaço entre Pautas"
                      : "Espaçamento"}
                  </Label>
                  <span className="text-sm font-mono font-medium text-primary tabular-nums">
                    {config.lineSpacingMm.toFixed(1)} mm
                  </span>
                </div>
                <Slider
                  value={[config.lineSpacingMm]}
                  onValueChange={([v]) => onChange({ lineSpacingMm: v })}
                  min={config.lineType === "music" ? 8 : 3}
                  max={config.lineType === "music" ? 40 : 20}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Cor da Pauta</Label>
                <div className="flex flex-wrap gap-1.5">
                  {LINE_COLORS.map((c) => (
                    <Tooltip key={c.value}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onChange({ lineColor: c.value })}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            config.lineColor === c.value
                              ? "border-primary scale-110"
                              : "border-transparent hover:border-muted-foreground"
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{c.label}</TooltipContent>
                    </Tooltip>
                  ))}
                  <input
                    type="color"
                    value={config.lineColor}
                    onChange={(e) => onChange({ lineColor: e.target.value })}
                    className="w-7 h-7 rounded-full border-2 border-border cursor-pointer"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Intensidade</Label>
                  <span className="text-sm font-mono font-medium text-primary tabular-nums">
                    {config.lineOpacity}%
                  </span>
                </div>
                <Slider
                  value={[config.lineOpacity]}
                  onValueChange={([v]) => onChange({ lineOpacity: v })}
                  min={10}
                  max={100}
                  step={5}
                />
                <p className="text-[11px] text-muted-foreground">
                  20–40% cria pauta discreta; 100% para linhas visíveis.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <Label className="text-sm">Borda da Pauta</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Moldura ao redor da área de escrita
                  </p>
                </div>
                <Switch
                  checked={config.showBorder}
                  onCheckedChange={(v) => onChange({ showBorder: v })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* PAPER */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Papel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Tamanho</Label>
            <Select
              value={config.paperSize}
              onValueChange={(v) => onChange({ paperSize: v as PaperSize })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAPER_SIZES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Orientação</Label>
            <div className="flex gap-2">
              {(["portrait", "landscape"] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => onChange({ orientation: o })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all ${
                    config.orientation === o
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  {o === "portrait" ? "Retrato" : "Paisagem"}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <button
              onClick={() => setMarginsOpen((v) => !v)}
              className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Margens
              {marginsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {marginsOpen && (
              <div className="pt-3 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Use 0 mm para preencher toda a página.
                </p>
                {(
                  [
                    ["marginTopMm", "Superior"],
                    ["marginBottomMm", "Inferior"],
                    ["marginLeftMm", "Esquerda"],
                    ["marginRightMm", "Direita"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={config[key]}
                          min={0}
                          max={50}
                          step={1}
                          onChange={(e) =>
                            onChange({
                              [key]: Math.max(
                                0,
                                Math.min(50, Number(e.target.value))
                              ),
                            })
                          }
                          className="w-12 text-xs font-mono text-primary text-right bg-background border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    </div>
                    <Slider
                      value={[config[key]]}
                      onValueChange={([v]) => onChange({ [key]: v })}
                      min={0}
                      max={50}
                      step={1}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DOUBLE-SIDED */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Impressão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Frente e Verso</Label>
              <p className="text-[11px] text-muted-foreground">
                Margens de encadernação alternadas
              </p>
            </div>
            <Switch
              checked={config.doubleSided}
              onCheckedChange={(v) => onChange({ doubleSided: v })}
            />
          </div>

          {config.doubleSided && (
            <div className="space-y-2 pl-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Margem de Encadernação</Label>
                <span className="text-xs font-mono text-primary">
                  {config.bindingMarginMm} mm
                </span>
              </div>
              <Slider
                value={[config.bindingMarginMm]}
                onValueChange={([v]) => onChange({ bindingMarginMm: v })}
                min={5}
                max={25}
                step={1}
              />
              <p className="text-[11px] text-muted-foreground">
                Páginas ímpares: margem extra à esquerda. Pares: à direita.
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Número de Páginas</Label>
              <span className="text-sm font-mono text-primary">
                {config.pageCount}
              </span>
            </div>
            <Slider
              value={[config.pageCount]}
              onValueChange={([v]) => onChange({ pageCount: v })}
              min={1}
              max={20}
              step={1}
            />
            {config.doubleSided && config.pageCount % 2 !== 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Para frente e verso, considere usar um número par de páginas.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Números de Página</Label>
            <Switch
              checked={config.showPageNumbers}
              onCheckedChange={(v) => onChange({ showPageNumbers: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* HEADER / FOOTER */}
      <Card>
        <CardHeader className="pb-3">
          <button
            onClick={() => setHeaderFooterOpen((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Cabeçalho e Rodapé
            </CardTitle>
            {headerFooterOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>

        {headerFooterOpen && (
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Cabeçalho</Label>
              <Input
                placeholder="ex.: Nome, disciplina, turma..."
                value={config.headerText}
                onChange={(e) => onChange({ headerText: e.target.value })}
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Campo de Data</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Exibe campo no canto superior direito
                  </p>
                </div>
                <Switch
                  checked={config.showDate}
                  onCheckedChange={(v) => onChange({ showDate: v })}
                />
              </div>
              {config.showDate && (
                <Input
                  placeholder='ex.: "Data:" ou deixe vazio para ____/____/________'
                  value={config.dateText}
                  onChange={(e) => onChange({ dateText: e.target.value })}
                  maxLength={40}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Rodapé</Label>
              <Input
                placeholder="ex.: Escola, turma..."
                value={config.footerText}
                onChange={(e) => onChange({ footerText: e.target.value })}
                maxLength={80}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function LineSheetGenerator() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [exporting, setExporting] = useState(false);

  const { widthMm, heightMm } = useMemo(
    () => getPageDimensions(config),
    [config.paperSize, config.orientation]
  );

  const updateConfig = useCallback((updates: Partial<Config>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handlePrint = () => {
    window.print();
    toast.success("Pronto! Escolha 'Salvar como PDF' na janela de impressão.");
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportPDF(config);
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const currentLineType = LINE_TYPES.find((lt) => lt.value === config.lineType);

  return (
    <TooltipProvider>
      <style dangerouslySetInnerHTML={{ __html: buildPrintCSS(config) }} />

      <div className="min-h-screen p-4 bg-neutral-200 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto py-8 space-y-6">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Gerador de Folhas Pautadas
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Crie folhas personalizadas para cadernos, diários e planejadores.
              </p>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="gap-2"
                    disabled={exporting}
                  >
                    <FileDown className="w-4 h-4" />
                    {exporting ? "Gerando..." : "Exportar PDF"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Gera um PDF vetorial com todas as páginas
                </TooltipContent>
              </Tooltip>
              <Button onClick={handlePrint} size="lg" className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* SETTINGS PANEL */}
            <div className="lg:col-span-4 space-y-4 print:hidden">
              <SettingsPanel config={config} onChange={updateConfig} />
            </div>

            {/* PREVIEW AREA */}
            <div className="lg:col-span-8">
              {/* Status bar */}
              <div className="flex items-center gap-3 mb-3 print:hidden">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {currentLineType?.icon}
                  <span>{currentLineType?.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {PAPER_SIZES[config.paperSize].label}
                </Badge>
                {config.doubleSided && (
                  <Badge variant="outline" className="text-xs">
                    Frente e Verso
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {config.pageCount} {config.pageCount === 1 ? "página" : "páginas"}
                </span>
              </div>

              {/* Pages */}
              <div
                id="print-area"
                className="space-y-4 print:space-y-0"
              >
                {Array.from({ length: config.pageCount }, (_, i) => {
                  const pageNum = i + 1;
                  const isOdd = pageNum % 2 === 1;
                  return (
                    <div key={pageNum}>
                      {config.doubleSided && (
                        <div className="text-xs text-muted-foreground mb-1 print:hidden">
                          Página {pageNum} —{" "}
                          {isOdd ? "Frente (ímpar)" : "Verso (par)"}
                          {config.doubleSided && (
                            <span className="ml-1 text-primary/70">
                              · margem de encadernação à{" "}
                              {isOdd ? "esquerda" : "direita"}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="shadow-lg rounded-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                        <SheetPage
                          config={config}
                          pageNum={pageNum}
                          widthMm={widthMm}
                          heightMm={heightMm}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tip */}
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground print:hidden">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  A visualização é proporcional ao papel real. Use{" "}
                  <strong>Exportar PDF</strong> para resultado vetorial
                  preciso, ou <strong>Imprimir</strong> e escolha &quot;Salvar
                  como PDF&quot; no navegador.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
