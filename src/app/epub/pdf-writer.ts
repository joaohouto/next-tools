import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ParsedBook } from "./types";

const PAGE_WIDTH = 595.28; // A4, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BODY_SIZE = 11;
const HEADING_SIZE = 16;
const LINE_HEIGHT = 1.4;

export function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildPdf(book: ParsedBook): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(book.title);
  if (book.author) doc.setAuthor(book.author);

  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  if (book.coverBytes) {
    try {
      const img = book.coverMime?.includes("png")
        ? await doc.embedPng(book.coverBytes)
        : await doc.embedJpg(book.coverBytes);
      const coverPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const scale = Math.min((PAGE_WIDTH - MARGIN * 2) / img.width, (PAGE_HEIGHT - MARGIN * 2) / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      coverPage.drawImage(img, { x: (PAGE_WIDTH - w) / 2, y: (PAGE_HEIGHT - h) / 2, width: w, height: h });
    } catch {
      // cover embedding is best-effort; conversion still succeeds without it
    }
  }

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };
  const drawParagraph = (text: string, size: number, font: PDFFont, gapAfter: number) => {
    const lines = wrapText(font, text, size, maxWidth);
    const lineH = size * LINE_HEIGHT;
    for (const line of lines) {
      ensureSpace(lineH);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= lineH;
    }
    y -= gapAfter;
  };

  drawParagraph(book.title, HEADING_SIZE * 1.4, boldFont, book.author ? 6 : 20);
  if (book.author) drawParagraph(book.author, BODY_SIZE + 1, bodyFont, 20);

  let firstChapter = true;
  for (const chapter of book.chapters) {
    if (!firstChapter) newPage(); // each chapter starts on a fresh page
    firstChapter = false;
    drawParagraph(chapter.title, HEADING_SIZE, boldFont, 14);
    for (const block of chapter.blocks) {
      if (block.type === "heading") {
        drawParagraph(block.text, HEADING_SIZE * 0.8, boldFont, 10);
      } else {
        drawParagraph(block.text, BODY_SIZE, bodyFont, 8);
      }
    }
  }

  return doc.save();
}
