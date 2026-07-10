import { getPdfjs } from "../pdf/utils";
import type { BookChapter, ChapterBlock, ParsedBook } from "./types";

interface Line {
  text: string;
  fontSize: number;
  y: number;
}

interface RawBlock {
  text: string;
  fontSize: number;
}

function avg(nums: number[]): number {
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

// Weighted mode: each sample counts for `weight` votes so long paragraphs (which
// should define "body size") reliably outvote short headings, even in documents
// with few blocks where a plain block-count mode could tie or pick the wrong size.
function weightedMode(samples: { value: number; weight: number }[]): number {
  const counts = new Map<number, number>();
  for (const { value, weight } of samples) counts.set(value, (counts.get(value) ?? 0) + weight);
  let best = 0, bestCount = 0;
  for (const [n, c] of counts) if (c > bestCount) { best = n; bestCount = c; }
  return best;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPageLines(page: any): Promise<Line[]> {
  const content = await page.getTextContent();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems: any[] = content.items;
  const lineMap = new Map<number, { parts: string[]; sizes: number[]; y: number }>();

  for (const item of rawItems) {
    if (typeof item.str !== "string") continue; // skip TextMarkedContent entries
    const [a, , , d, , f] = item.transform as number[];
    const fontSize = Math.hypot(a, d) || Math.abs(d) || 10;
    const y = f as number;
    const key = Math.round(y / 3) * 3; // bucket nearby y-values into the same line
    let line = lineMap.get(key);
    if (!line) { line = { parts: [], sizes: [], y }; lineMap.set(key, line); }
    line.parts.push(item.str);
    line.sizes.push(fontSize);
  }

  return Array.from(lineMap.values())
    .sort((a, b) => b.y - a.y) // PDF y grows upward — sort top to bottom
    .map((l) => ({ text: l.parts.join("").replace(/\s+/g, " ").trim(), fontSize: avg(l.sizes), y: l.y }))
    .filter((l) => l.text.length > 0);
}

function linesToBlocks(lines: Line[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let current: { texts: string[]; sizes: number[] } | null = null;
  let prevY: number | null = null;

  for (const line of lines) {
    const gap = prevY === null ? 0 : prevY - line.y;
    const isNewBlock = current === null || gap > line.fontSize * 1.6;
    if (isNewBlock) {
      if (current) blocks.push({ text: current.texts.join(" ").replace(/\s+/g, " ").trim(), fontSize: avg(current.sizes) });
      current = { texts: [line.text], sizes: [line.fontSize] };
    } else {
      current!.texts.push(line.text);
      current!.sizes.push(line.fontSize);
    }
    prevY = line.y;
  }
  if (current) blocks.push({ text: current.texts.join(" ").replace(/\s+/g, " ").trim(), fontSize: avg(current.sizes) });

  return blocks.filter((b) => b.text.length > 0);
}

function groupIntoChapters(blocks: ChapterBlock[]): BookChapter[] {
  const chapters: BookChapter[] = [];
  let current: BookChapter | null = null;
  let partCount = 0;
  const MAX_BLOCKS_WITHOUT_HEADING = 400; // fallback split for documents with no detected headings

  for (const block of blocks) {
    if (block.type === "heading") {
      current = { title: block.text, blocks: [] };
      chapters.push(current);
      continue;
    }
    if (!current) {
      partCount++;
      current = { title: `Parte ${partCount}`, blocks: [] };
      chapters.push(current);
    }
    current.blocks.push(block);
    if (current.blocks.length >= MAX_BLOCKS_WITHOUT_HEADING) current = null;
  }

  return chapters.filter((c) => c.blocks.length > 0);
}

export async function parsePdf(file: File, onProgress?: (page: number, total: number) => void): Promise<ParsedBook> {
  const pdfjs = await getPdfjs();
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const numPages = doc.numPages;

  const pageBlocks: RawBlock[][] = [];
  const sizeSamples: { value: number; weight: number }[] = [];
  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const blocks = linesToBlocks(await extractPageLines(page));
    pageBlocks.push(blocks);
    blocks.forEach((b) => sizeSamples.push({ value: Math.round(b.fontSize), weight: b.text.length }));
    onProgress?.(p, numPages);
  }

  const bodySize = weightedMode(sizeSamples) || 10;
  const headingThreshold = bodySize * 1.25;

  const flat: ChapterBlock[] = [];
  for (const blocks of pageBlocks) {
    for (const b of blocks) {
      const type: ChapterBlock["type"] = b.fontSize >= headingThreshold && b.text.length < 120 ? "heading" : "paragraph";
      flat.push({ type, text: b.text });
    }
  }

  const chapters = groupIntoChapters(flat);
  if (chapters.length === 0) {
    throw new Error("Não foi possível extrair texto deste PDF — ele pode conter apenas imagens escaneadas.");
  }

  let coverBytes: Uint8Array | undefined;
  try {
    const firstPage = await doc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await firstPage.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob) coverBytes = new Uint8Array(await blob.arrayBuffer());
  } catch {
    // cover is a nice-to-have; conversion still succeeds without it
  }

  return {
    title: file.name.replace(/\.pdf$/i, ""),
    coverBytes,
    coverMime: coverBytes ? "image/jpeg" : undefined,
    chapters,
  };
}
