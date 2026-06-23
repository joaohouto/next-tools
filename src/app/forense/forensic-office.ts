import type { OfficeMeta } from "./forensic-types";

// DOCX/XLSX/PPTX are ZIP files containing docProps/core.xml
// We parse the ZIP central directory to find the file offset, then read the XML

function readUint16LE(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8);
}
function readUint32LE(buf: Uint8Array, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
}

function findEOCD(buf: Uint8Array): number {
  // Search backwards for PK\x05\x06
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      return i;
    }
  }
  return -1;
}

function readLocalFile(buf: Uint8Array, offset: number): Uint8Array | null {
  // Local file header: PK\x03\x04
  if (buf[offset] !== 0x50 || buf[offset + 1] !== 0x4b || buf[offset + 2] !== 0x03 || buf[offset + 3] !== 0x04) {
    return null;
  }
  const fnLen = readUint16LE(buf, offset + 26);
  const extraLen = readUint16LE(buf, offset + 28);
  const compSize = readUint32LE(buf, offset + 18);
  const dataStart = offset + 30 + fnLen + extraLen;
  return buf.slice(dataStart, dataStart + compSize);
}

function findInCentralDir(buf: Uint8Array, targetName: string): number {
  const eocdOff = findEOCD(buf);
  if (eocdOff < 0) return -1;
  const cdOffset = readUint32LE(buf, eocdOff + 16);
  const cdSize = readUint32LE(buf, eocdOff + 12);
  let pos = cdOffset;
  while (pos < cdOffset + cdSize && pos + 46 <= buf.length) {
    if (buf[pos] !== 0x50 || buf[pos + 1] !== 0x4b || buf[pos + 2] !== 0x01 || buf[pos + 3] !== 0x02) break;
    const fnLen = readUint16LE(buf, pos + 28);
    const extraLen = readUint16LE(buf, pos + 30);
    const commentLen = readUint16LE(buf, pos + 32);
    const localOff = readUint32LE(buf, pos + 42);
    const name = new TextDecoder().decode(buf.slice(pos + 46, pos + 46 + fnLen));
    if (name === targetName) return localOff;
    pos += 46 + fnLen + extraLen + commentLen;
  }
  return -1;
}

function getXmlText(xml: string, tag: string): string | undefined {
  // Try namespaced tags first: <dc:title>, <cp:lastModifiedBy>, etc.
  const patterns = [
    new RegExp(`<[a-z]+:${tag}[^>]*>([^<]*)<`, "i"),
    new RegExp(`<${tag}[^>]*>([^<]*)<`, "i"),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

export async function extractOfficeMeta(file: File): Promise<OfficeMeta> {
  const buf = new Uint8Array(await file.arrayBuffer());

  // Verify it's a ZIP
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) return {};

  const coreOffset = findInCentralDir(buf, "docProps/core.xml");
  if (coreOffset < 0) return {};

  const rawData = readLocalFile(buf, coreOffset);
  if (!rawData) return {};

  // The data might be stored uncompressed (method 0) or deflate (method 8)
  // Check compression method from local file header
  const method = readUint16LE(buf, coreOffset + 8);
  let xmlBytes: Uint8Array;
  if (method === 0) {
    xmlBytes = rawData;
  } else if (method === 8) {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writer.write(rawData as any);
      writer.close();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      xmlBytes = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { xmlBytes.set(c, off); off += c.length; }
    } catch {
      return {};
    }
  } else {
    return {};
  }

  const xml = new TextDecoder().decode(xmlBytes);

  return {
    title: getXmlText(xml, "title"),
    creator: getXmlText(xml, "creator"),
    lastModifiedBy: getXmlText(xml, "lastModifiedBy"),
    revision: getXmlText(xml, "revision"),
    created: getXmlText(xml, "created"),
    modified: getXmlText(xml, "modified"),
    description: getXmlText(xml, "description"),
    keywords: getXmlText(xml, "keywords"),
  };
}
