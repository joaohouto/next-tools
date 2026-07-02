import { PDFDocument, type PDFImage } from "pdf-lib";
import { imageFileToBlob } from "./canvas-image";

export async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

/** Renders one PDF page to a data URL image at the given scale. */
export async function renderPdfPage(
  file: File,
  pageNum: number,
  scale: number,
  mime: "image/png" | "image/jpeg" = "image/png",
): Promise<{ dataUrl: string; width: number; height: number }> {
  const pdfjs = await getPdfjs();
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
  return {
    dataUrl: canvas.toDataURL(mime, mime === "image/jpeg" ? 0.9 : undefined),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  return doc.numPages;
}

/** Adds an image file as a new full-page in the given PDF document. */
export async function addImagePageToPdf(doc: PDFDocument, file: File) {
  let emb: PDFImage;
  if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) {
    emb = await doc.embedJpg(await file.arrayBuffer());
  } else {
    const pngBlob = await imageFileToBlob(file, "image/png");
    emb = await doc.embedPng(await pngBlob.arrayBuffer());
  }
  const page = doc.addPage([emb.width, emb.height]);
  page.drawImage(emb, { x: 0, y: 0, width: emb.width, height: emb.height });
}

export function makePdfFile(bytes: Uint8Array, name: string): File {
  return new File([bytes as BlobPart], name, { type: "application/pdf" });
}
