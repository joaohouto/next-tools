import { imagesModule } from "./images";
import { pdfModule } from "./pdf";
import { spreadsheetModule } from "./spreadsheet";
import { documentModule } from "./document";
import { presentationModule } from "./presentation";
import type { ConverterCategory, ConverterModule } from "./types";

export const MODULES: ConverterModule[] = [
  imagesModule,
  pdfModule,
  spreadsheetModule,
  documentModule,
  presentationModule,
];

export function getModuleFor(file: File): ConverterModule | null {
  return MODULES.find((m) => m.detect(file)) ?? null;
}

export function detectCategory(file: File): ConverterCategory | null {
  return getModuleFor(file)?.id ?? null;
}

export function getModuleByCategory(category: ConverterCategory): ConverterModule | undefined {
  return MODULES.find((m) => m.id === category);
}

export const ACCEPT_ALL = MODULES.flatMap((m) => m.accept).join(",");
