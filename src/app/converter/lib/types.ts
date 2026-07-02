export type ConverterCategory = "image" | "pdf" | "spreadsheet" | "document" | "presentation";

export interface TargetFormat {
  id: string;
  label: string;
  ext: string;
  mime: string;
  /** true = limited/lossy conversion — UI shows a warning badge */
  limited?: boolean;
}

export interface ConvertedFile {
  name: string;
  blob: Blob;
  /** id of the ConvertItem that produced this file — supports 1→N (pdf→pages) */
  sourceFileId: string;
}

/** A file paired with the stable id the UI assigned it (File objects carry no id of their own). */
export interface ConvertInput {
  id: string;
  file: File;
}

export type ConvertProgress = (fileId: string, status: "processing" | "done" | "error") => void;

export interface ConverterModule {
  id: ConverterCategory;
  label: string;
  /** accept string for <input accept> */
  accept: string[];
  detect(file: File): boolean;
  getTargets(files: File[]): TargetFormat[];
  convert(inputs: ConvertInput[], target: TargetFormat, onProgress: ConvertProgress): Promise<ConvertedFile[]>;
}
