import type { CropRect, ExportSettings, Frame } from "./types";
import { cropAspect, formatClock, formatTimecode, FULL_CROP } from "./utils";

/**
 * Canvas is the single renderer for both outputs: the PNG *is* a sheet, and the
 * PDF embeds the same sheets as pages. Keeping one layout implementation means
 * the two exports can never drift apart — and it sidesteps pdf-lib's WinAnsi
 * limitation, since accents and any other character are drawn by the browser.
 */

// A4 portrait at 150 dpi.
const SHEET_W = 1240;
const SHEET_H = 1754;

const MARGIN = 64;
const GUTTER = 28;
const ROW_GAP = 36;
const IMAGE_GAP = 12;
const FOOTER_H = 44;
const RADIUS = 10;

const TITLE_SIZE = 32;
const SUB_SIZE = 15;
const META_SIZE = 15;
const CAPTION_SIZE = 16;
const CAPTION_LEADING = 1.45;

const INK = "#111827";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const PLACEHOLDER = "#f3f4f6";

export interface SheetContext {
  videoName: string;
  duration: number;
  /** Region of each frame to print. Frames are always captured whole. */
  crop?: CropRect | null;
}

export type GetImage = (frame: Frame) => Promise<HTMLImageElement>;

/** Resolves the app's own fonts so exports match the site's typography. */
function fontStacks() {
  const fallbackSans = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const fallbackMono = "ui-monospace, 'SF Mono', Menlo, monospace";
  if (typeof window === "undefined") return { sans: fallbackSans, mono: fallbackMono };

  const styles = getComputedStyle(document.body);
  const sans = styles.getPropertyValue("--font-geist-sans").trim();
  const mono = styles.getPropertyValue("--font-geist-mono").trim();
  return {
    sans: sans ? `${sans}, ${fallbackSans}` : fallbackSans,
    mono: mono ? `${mono}, ${fallbackMono}` : fallbackMono,
  };
}

/** Breaks `text` into lines that fit `maxWidth`, honouring manual line breaks. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

interface Cell {
  frame: Frame;
  image: HTMLImageElement;
  index: number;
  imageHeight: number;
  metaHeight: number;
  captionLines: string[];
  height: number;
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, RADIUS);
}

export async function renderSheets(
  frames: Frame[],
  settings: ExportSettings,
  getImage: GetImage,
  context: SheetContext,
): Promise<HTMLCanvasElement[]> {
  if (frames.length === 0) return [];

  // Without this the first sheet can render in the fallback font.
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  const { sans, mono } = fontStacks();
  const crop = context.crop ?? FULL_CROP;
  const columns = settings.columns;
  const contentW = SHEET_W - MARGIN * 2;
  const cellW = (contentW - GUTTER * (columns - 1)) / columns;

  const measure = document.createElement("canvas").getContext("2d")!;

  // ─── header ─────────────────────────────────────────────────────────────────
  const subtitle = `${context.videoName} · ${formatClock(context.duration)} · ${frames.length} quadro${frames.length !== 1 ? "s" : ""}`;
  const title = settings.title.trim();
  const headerHeight =
    (title ? TITLE_SIZE * 1.25 + 8 : 0) + SUB_SIZE * 1.4 + 26;

  // ─── measure every cell ─────────────────────────────────────────────────────
  const images = await Promise.all(frames.map(getImage));

  const metaHeight = settings.showIndex || settings.showTimecode ? META_SIZE * 1.6 : 0;
  const footerHeight = settings.paginate ? FOOTER_H : 0;
  // Tallest a single row may be, so no cell is ever clipped by a page break.
  const maxRowHeight = SHEET_H - MARGIN * 2 - headerHeight - footerHeight;

  const cells: Cell[] = frames.map((frame, index) => {
    const image = images[index];
    const aspect = cropAspect(crop, image.naturalWidth, image.naturalHeight);

    measure.font = `400 ${CAPTION_SIZE}px ${sans}`;
    const captionLines =
      settings.showCaption && frame.caption.trim()
        ? wrapText(measure, frame.caption.trim(), cellW)
        : [];
    const captionHeight = captionLines.length * CAPTION_SIZE * CAPTION_LEADING;

    let imageHeight = cellW / aspect;
    if (settings.paginate) {
      const room = maxRowHeight - IMAGE_GAP - metaHeight - captionHeight;
      imageHeight = Math.max(80, Math.min(imageHeight, room));
    }

    return {
      frame,
      image,
      index,
      imageHeight,
      metaHeight,
      captionLines,
      height: imageHeight + IMAGE_GAP + metaHeight + captionHeight,
    };
  });

  // ─── group into rows, then rows into sheets ─────────────────────────────────
  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  const rowHeight = (row: Cell[]) => Math.max(...row.map((c) => c.height));

  const sheets: Cell[][][] = [];
  if (settings.paginate) {
    let current: Cell[][] = [];
    let used = 0;
    for (const row of rows) {
      const needed = rowHeight(row) + (current.length ? ROW_GAP : 0);
      const available =
        SHEET_H - MARGIN * 2 - footerHeight - (sheets.length === 0 ? headerHeight : 0);
      if (current.length && used + needed > available) {
        sheets.push(current);
        current = [];
        used = 0;
      }
      used += current.length ? needed : rowHeight(row);
      current.push(row);
    }
    if (current.length) sheets.push(current);
  } else {
    sheets.push(rows);
  }

  // ─── draw ───────────────────────────────────────────────────────────────────
  return sheets.map((sheetRows, sheetIndex) => {
    const isFirst = sheetIndex === 0;
    const bodyHeight =
      sheetRows.reduce((sum, row) => sum + rowHeight(row), 0) +
      ROW_GAP * Math.max(0, sheetRows.length - 1);

    const canvas = document.createElement("canvas");
    canvas.width = SHEET_W;
    canvas.height = settings.paginate
      ? SHEET_H
      : Math.ceil(MARGIN * 2 + headerHeight + bodyHeight);

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "top";

    let y = MARGIN;

    if (isFirst) {
      if (title) {
        ctx.fillStyle = INK;
        ctx.font = `600 ${TITLE_SIZE}px ${sans}`;
        ctx.fillText(title, MARGIN, y);
        y += TITLE_SIZE * 1.25 + 8;
      }
      ctx.fillStyle = MUTED;
      ctx.font = `400 ${SUB_SIZE}px ${sans}`;
      ctx.fillText(subtitle, MARGIN, y);
      y += SUB_SIZE * 1.4 + 12;

      ctx.fillStyle = RULE;
      ctx.fillRect(MARGIN, y, contentW, 1);
      y += 14;
    }

    for (const row of sheetRows) {
      row.forEach((cell, column) => {
        const x = MARGIN + column * (cellW + GUTTER);
        let cellY = y;

        ctx.save();
        roundedClip(ctx, x, cellY, cellW, cell.imageHeight);
        ctx.fillStyle = PLACEHOLDER;
        ctx.fill();
        ctx.clip();
        // Only the cropped region is drawn, `cover`ing the cell so a page break
        // that shortened this row still fills it instead of letterboxing.
        const source = {
          x: cell.image.naturalWidth * crop.x,
          y: cell.image.naturalHeight * crop.y,
          width: cell.image.naturalWidth * crop.width,
          height: cell.image.naturalHeight * crop.height,
        };
        const aspect = cropAspect(crop, cell.image.naturalWidth, cell.image.naturalHeight);
        const drawW = Math.max(cellW, cell.imageHeight * aspect);
        const drawH = drawW / aspect;
        ctx.drawImage(
          cell.image,
          source.x,
          source.y,
          source.width,
          source.height,
          x + (cellW - drawW) / 2,
          cellY + (cell.imageHeight - drawH) / 2,
          drawW,
          drawH,
        );
        ctx.restore();

        cellY += cell.imageHeight + IMAGE_GAP;

        if (cell.metaHeight > 0) {
          let metaX = x;
          if (settings.showIndex) {
            ctx.fillStyle = INK;
            ctx.font = `600 ${META_SIZE}px ${sans}`;
            const label = `${cell.index + 1}`;
            ctx.fillText(label, metaX, cellY);
            metaX += ctx.measureText(label).width + 10;
          }
          if (settings.showTimecode) {
            ctx.fillStyle = MUTED;
            ctx.font = `400 ${META_SIZE}px ${mono}`;
            ctx.fillText(formatTimecode(cell.frame.time), metaX, cellY);
          }
          cellY += cell.metaHeight;
        }

        if (cell.captionLines.length) {
          ctx.fillStyle = INK;
          ctx.font = `400 ${CAPTION_SIZE}px ${sans}`;
          for (const line of cell.captionLines) {
            ctx.fillText(line, x, cellY);
            cellY += CAPTION_SIZE * CAPTION_LEADING;
          }
        }
      });

      y += rowHeight(row) + ROW_GAP;
    }

    if (settings.paginate && sheets.length > 1) {
      ctx.fillStyle = MUTED;
      ctx.font = `400 13px ${mono}`;
      ctx.textAlign = "right";
      ctx.fillText(`${sheetIndex + 1} / ${sheets.length}`, SHEET_W - MARGIN, SHEET_H - MARGIN);
      ctx.textAlign = "left";
    }

    return canvas;
  });
}
