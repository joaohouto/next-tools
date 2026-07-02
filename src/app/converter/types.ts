import type { ConverterCategory, ConvertedFile } from "./lib/types";

export type ItemStatus = "idle" | "processing" | "done" | "error";

export interface ConvertItem {
  id: string;
  file: File;
  category: ConverterCategory | null;
  previewUrl?: string;
  status: ItemStatus;
  results: ConvertedFile[];
}
