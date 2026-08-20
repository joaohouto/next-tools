import type {
  AspectRatioId,
  MosaicCategory,
  MosaicTemplate,
  SizePresetId,
} from "./types";

export const RATIO_OPTIONS: {
  id: Exclude<AspectRatioId, "custom">;
  label: string;
  ratio: number;
}[] = [
  { id: "square", label: "Quadrado", ratio: 1 },
  { id: "portrait", label: "Retrato", ratio: 4 / 5 },
  { id: "landscape", label: "Paisagem", ratio: 3 / 2 },
  { id: "widescreen", label: "Widescreen", ratio: 16 / 9 },
  { id: "story", label: "Story", ratio: 9 / 16 },
];

export const SIZE_PRESETS: { id: SizePresetId; label: string; longestEdge: number }[] = [
  { id: "sm", label: "Pequeno", longestEdge: 1080 },
  { id: "md", label: "Médio", longestEdge: 2048 },
  { id: "lg", label: "Grande", longestEdge: 3000 },
  { id: "xl", label: "Extra grande", longestEdge: 4000 },
];

export const MIN_CUSTOM_DIMENSION = 200;
export const MAX_CUSTOM_DIMENSION = 6000;

function makeColumnsTemplate(n: number): MosaicTemplate {
  return {
    id: `columns-${n}`,
    label: "Colunas",
    category: "columns",
    columns: n,
    rows: 1,
    cells: Array.from({ length: n }, (_, i) => ({ col: i + 1, row: 1, colSpan: 1, rowSpan: 1 })),
  };
}

function makeRowsTemplate(n: number): MosaicTemplate {
  return {
    id: `rows-${n}`,
    label: "Linhas",
    category: "rows",
    columns: 1,
    rows: n,
    cells: Array.from({ length: n }, (_, i) => ({ col: 1, row: i + 1, colSpan: 1, rowSpan: 1 })),
  };
}

function makeGridTemplate(n: number): MosaicTemplate {
  const columns = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / columns);
  return {
    id: `grid-${n}`,
    label: "Grade",
    category: "grid",
    columns,
    rows,
    cells: Array.from({ length: n }, (_, i) => ({
      col: (i % columns) + 1,
      row: Math.floor(i / columns) + 1,
      colSpan: 1,
      rowSpan: 1,
    })),
  };
}

/** Generates a procedural (non-bento, non-smart) template sized for the live photo count `n`. */
export function generateTemplate(
  category: Exclude<MosaicCategory, "bento" | "smart">,
  n: number,
): MosaicTemplate {
  if (category === "columns") return makeColumnsTemplate(n);
  if (category === "rows") return makeRowsTemplate(n);
  return makeGridTemplate(n);
}

/**
 * Curated fixed-count bento layouts. Each `cells` array has been hand-verified
 * to tile its `columns × rows` grid exactly, with no gaps or overlaps.
 */
export const BENTO_TEMPLATES: MosaicTemplate[] = [
  {
    id: "bento-3-hero-left",
    label: "Destaque à esquerda",
    category: "bento",
    columns: 3,
    rows: 2,
    cells: [
      { col: 1, row: 1, colSpan: 2, rowSpan: 2 },
      { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    id: "bento-4-banner-top",
    label: "Faixa no topo",
    category: "bento",
    columns: 2,
    rows: 3,
    cells: [
      { col: 1, row: 1, colSpan: 2, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 1, rowSpan: 2 },
      { col: 2, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 3, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    id: "bento-4-hero-right",
    label: "Destaque à direita",
    category: "bento",
    columns: 3,
    rows: 2,
    cells: [
      { col: 3, row: 1, colSpan: 1, rowSpan: 2 },
      { col: 1, row: 1, colSpan: 2, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    id: "bento-5-hero-grid",
    label: "Destaque com grade",
    category: "bento",
    columns: 4,
    rows: 2,
    cells: [
      { col: 1, row: 1, colSpan: 2, rowSpan: 2 },
      { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  },
  {
    id: "bento-6-hero-strip",
    label: "Destaque com faixa",
    category: "bento",
    columns: 6,
    rows: 2,
    cells: [
      { col: 1, row: 1, colSpan: 3, rowSpan: 2 },
      { col: 4, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 6, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 4, row: 2, colSpan: 2, rowSpan: 1 },
      { col: 6, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  },
];

export function getBentoTemplatesForCount(n: number): MosaicTemplate[] {
  return BENTO_TEMPLATES.filter((t) => t.cells.length === n);
}
