import { PDFDocument } from "pdf-lib";

import { downloadBlob } from "./utils";

/** A4 portrait in PDF points — matches the 1240×1754 px sheets from `compose.ts`. */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas-encode-failed"))),
      type,
      quality,
    );
  });
}

/** The "single image" output: one tall sheet with every frame. */
export async function exportPng(sheets: HTMLCanvasElement[], fileName: string) {
  const blob = await canvasToBlob(sheets[0], "image/png");
  downloadBlob(blob, `${fileName}.png`);
}

/** One A4 page per sheet, each embedded as a JPEG. */
export async function exportPdf(sheets: HTMLCanvasElement[], fileName: string) {
  const doc = await PDFDocument.create();

  for (const sheet of sheets) {
    const blob = await canvasToBlob(sheet, "image/jpeg", 0.92);
    const image = await doc.embedJpg(await blob.arrayBuffer());
    const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawImage(image, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });
  }

  const bytes = await doc.save();
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${fileName}.pdf`);
}
