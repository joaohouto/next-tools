// ─── shared PDF tool types ─────────────────────────────────────────────────────

export type Mode = "idle" | "choosing" | "merge" | "split" | "to-image" | "organize" | "compress";

export interface MergeItem {
  id: string;
  file: File;
  kind: "pdf" | "image";
  pageCount?: number;
  /** object URL for images; rendered JPEG dataUrl for PDFs; null = loading */
  thumbnail: string | null;
}

export interface RenderedPage {
  number: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PageRot {
  number: number;
  thumb: string | null;
  existingDeg: number;
  delta: number;
  deleted: boolean;
}

export type SplitStrategy = "select" | "every-n" | "equal" | "individual" | "bookmarks" | "by-size";
export type SizeUnit = "KB" | "MB";

export interface BookmarkEntry {
  title: string;
  startPage: number;
}

export interface SplitPart {
  label: string;
  pages: number[];
}

export type CompressQuality = "low" | "medium" | "high";

/** Tracks which tool produced the current file for the chaining breadcrumb. */
export interface ChainSource {
  toolLabel: string;
  originalName: string;
}

/** Base props for single-file views that support chaining. */
export interface ViewProps {
  file: File;
  pageCount: number;
  onBack: () => void;
  onUseResult: (file: File, source: ChainSource) => void;
}
