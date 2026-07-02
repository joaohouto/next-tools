import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as htmlToImage from "html-to-image";
import type { ConverterModule, TargetFormat } from "./types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DOCX_TARGETS: TargetFormat[] = [
  { id: "txt", label: "TXT", ext: "txt", mime: "text/plain" },
  { id: "html", label: "HTML", ext: "html", mime: "text/html" },
  { id: "pdf", label: "PDF", ext: "pdf", mime: "application/pdf", limited: true },
];

const TXT_TARGETS: TargetFormat[] = [
  { id: "docx", label: "DOCX", ext: "docx", mime: DOCX_MIME },
];

function isDocxFile(file: File) {
  return /\.docx$/i.test(file.name) || file.type === DOCX_MIME;
}

function isTextFile(file: File) {
  return /\.txt$/i.test(file.name) || file.type === "text/plain";
}

async function docxToHtml(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function docxToText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** Rasterizes HTML into a single-column PDF. Loses selectable text/formatting fidelity. */
async function htmlToPdfBlob(html: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed; left:-9999px; top:0; width:800px; background:#fff; padding:32px; font-family:Georgia,serif; color:#111; font-size:14px; line-height:1.5;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const dataUrl = await htmlToImage.toPng(container, { pixelRatio: 2, cacheBust: true });
    const pngBytes = await (await fetch(dataUrl)).arrayBuffer();
    const doc = await PDFDocument.create();
    const emb = await doc.embedPng(pngBytes);
    const pageWidth = 595.28; // A4 width in pt
    const scale = pageWidth / emb.width;
    const page = doc.addPage([pageWidth, emb.height * scale]);
    page.drawImage(emb, { x: 0, y: 0, width: pageWidth, height: emb.height * scale });
    const bytes = await doc.save();
    return new Blob([bytes as BlobPart], { type: "application/pdf" });
  } finally {
    document.body.removeChild(container);
  }
}

/** Wraps plain text into simple DOCX paragraphs (no rich formatting). */
export async function textToDocxBlob(text: string): Promise<Blob> {
  const { Document, Packer, Paragraph } = await import("docx");
  const doc = new Document({
    sections: [{ children: text.split("\n").map((line) => new Paragraph(line)) }],
  });
  return Packer.toBlob(doc);
}

/** Draws wrapped plain text across A4 pages using vector text (no rasterization). */
export async function textToPdfBlob(text: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.4;

  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") { lines.push(""); continue; }
    let current = "";
    for (const word of paragraph.split(" ")) {
      const test = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export const documentModule: ConverterModule = {
  id: "document",
  label: "Documentos",
  accept: [".docx", ".txt"],
  detect: (file) => isDocxFile(file) || isTextFile(file),

  getTargets: (files) => (files.every(isTextFile) ? TXT_TARGETS : DOCX_TARGETS),

  async convert(inputs, target, onProgress) {
    const results = [];
    for (const { id, file } of inputs) {
      onProgress(id, "processing");
      try {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        let blob: Blob;
        if (isTextFile(file) && target.id === "docx") {
          blob = await textToDocxBlob(await file.text());
        } else if (target.id === "txt") {
          blob = new Blob([await docxToText(file)], { type: "text/plain" });
        } else if (target.id === "html") {
          blob = new Blob([await docxToHtml(file)], { type: "text/html" });
        } else {
          blob = await htmlToPdfBlob(await docxToHtml(file));
        }
        results.push({ name: `${baseName}.${target.ext}`, blob, sourceFileId: id });
        onProgress(id, "done");
      } catch {
        onProgress(id, "error");
      }
    }
    return results;
  },
};
