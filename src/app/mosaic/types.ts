export interface MosaicPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

export type MosaicCategory = "columns" | "rows" | "grid" | "bento";

export interface MosaicCell {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface MosaicTemplate {
  id: string;
  label: string;
  category: MosaicCategory;
  columns: number;
  rows: number;
  /** cells.length is the exact photo count this template needs */
  cells: MosaicCell[];
}

export type AspectRatioId =
  | "square"
  | "portrait"
  | "landscape"
  | "widescreen"
  | "story"
  | "custom";

export type SizePresetId = "sm" | "md" | "lg" | "xl";

export interface MosaicConfig {
  templateCategory: MosaicCategory;
  /** only meaningful when templateCategory === "bento" */
  bentoTemplateId: string | null;
  aspectRatio: AspectRatioId;
  sizePreset: SizePresetId;
  customWidth: number;
  customHeight: number;
  gap: number;
  radius: number;
  backgroundColor: string;
}
