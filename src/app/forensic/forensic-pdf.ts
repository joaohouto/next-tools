import type { PdfMeta } from "./forensic-types";

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

function toDateStr(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    const m = val.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    }
    return val;
  }
  return String(val);
}

export async function extractPdfMeta(file: File): Promise<PdfMeta> {
  const pdfjs = await getPdfjs();
  const bytes = await file.arrayBuffer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any = null;
  let encrypted = false;

  // Detect version from header
  const header = new TextDecoder().decode(new Uint8Array(bytes, 0, 10));
  const versionMatch = header.match(/%PDF-(\d+\.\d+)/);
  const version = versionMatch ? versionMatch[1] : undefined;

  // Detect encryption keyword in raw bytes
  const text = new TextDecoder("latin1").decode(new Uint8Array(bytes));
  encrypted = text.includes("/Encrypt");

  try {
    const docTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    doc = await docTask.promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("password")) {
      return { encrypted: true, version };
    }
    throw err;
  }

  const pageCount = doc.numPages;
  const info = await doc.getMetadata().catch(() => null);
  const meta = info?.info as Record<string, unknown> ?? {};

  return {
    title: meta.Title as string | undefined,
    author: meta.Author as string | undefined,
    creator: meta.Creator as string | undefined,
    producer: meta.Producer as string | undefined,
    subject: meta.Subject as string | undefined,
    keywords: meta.Keywords as string | undefined,
    creationDate: toDateStr(meta.CreationDate),
    modDate: toDateStr(meta.ModDate),
    pageCount,
    version,
    encrypted,
  };
}
