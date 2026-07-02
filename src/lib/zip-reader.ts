// Minimal ZIP central-directory reader for OOXML files (docx/xlsx/pptx are ZIP archives).
// Uses the browser's native DecompressionStream instead of a JS zip library.

export interface ZipEntry {
  name: string;
  method: number; // 0 = stored, 8 = deflate
  compressedSize: number;
  localHeaderOffset: number;
}

function readUint16LE(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8);
}
function readUint32LE(buf: Uint8Array, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
}

function findEOCD(buf: Uint8Array): number {
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) return i;
  }
  return -1;
}

export function readZipEntries(buf: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const eocdOff = findEOCD(buf);
  if (eocdOff < 0) return entries;

  const cdOffset = readUint32LE(buf, eocdOff + 16);
  const cdSize = readUint32LE(buf, eocdOff + 12);
  let pos = cdOffset;
  while (pos + 46 <= buf.length && pos < cdOffset + cdSize) {
    if (buf[pos] !== 0x50 || buf[pos + 1] !== 0x4b || buf[pos + 2] !== 0x01 || buf[pos + 3] !== 0x02) break;
    const method = readUint16LE(buf, pos + 10);
    const compressedSize = readUint32LE(buf, pos + 20);
    const fnLen = readUint16LE(buf, pos + 28);
    const extraLen = readUint16LE(buf, pos + 30);
    const commentLen = readUint16LE(buf, pos + 32);
    const localHeaderOffset = readUint32LE(buf, pos + 42);
    const name = new TextDecoder().decode(buf.slice(pos + 46, pos + 46 + fnLen));
    entries.push({ name, method, compressedSize, localHeaderOffset });
    pos += 46 + fnLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(data as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

export async function readZipEntryBytes(buf: Uint8Array, entry: ZipEntry): Promise<Uint8Array | null> {
  const offset = entry.localHeaderOffset;
  if (buf[offset] !== 0x50 || buf[offset + 1] !== 0x4b || buf[offset + 2] !== 0x03 || buf[offset + 3] !== 0x04) return null;
  const fnLen = readUint16LE(buf, offset + 26);
  const extraLen = readUint16LE(buf, offset + 28);
  const dataStart = offset + 30 + fnLen + extraLen;
  const raw = buf.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRaw(raw);
  return null;
}
