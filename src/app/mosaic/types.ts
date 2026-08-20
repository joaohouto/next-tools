export interface MosaicPhoto {
  id: string;
  file: File;
  previewUrl: string;
  /** natural pixel dimensions, used by the "smart" justified layout */
  width: number;
  height: number;
}

export type MosaicCategory = "columns" | "rows" | "grid" | "bento" | "smart";

export interface JustifiedGroup {
  photoIndices: number[];
  /** relative weight along the stacking axis — a flex-grow factor, not a pixel value */
  weight: number;
}

export interface JustifiedLayout {
  /** "rows": groups stack vertically, photos flow left-to-right within a group.
   *  "columns": groups sit side-by-side, photos stack top-to-bottom within a group. */
  direction: "rows" | "columns";
  groups: JustifiedGroup[];
  /** container width ÷ total height, at the reference size used to compute the layout */
  aspectRatio: number;
}

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
