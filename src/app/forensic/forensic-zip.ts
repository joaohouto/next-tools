import type { ZipEntry } from "./forensic-types";

function readUint16LE(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8);
}
function readUint32LE(buf: Uint8Array, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
}

function dosDateToString(date: number, time: number): string {
  const year = ((date >> 9) & 0x7f) + 1980;
  const month = (date >> 5) & 0x0f;
  const day = date & 0x1f;
  const hour = (time >> 11) & 0x1f;
  const min = (time >> 5) & 0x3f;
  const sec = (time & 0x1f) * 2;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const COMPRESS_METHODS: Record<number, string> = {
  0: "Stored",
  8: "Deflate",
  12: "BZIP2",
  14: "LZMA",
};

export function listZipEntries(buf: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];

  // Find EOCD
  let eocdOff = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocdOff = i; break;
    }
  }
  if (eocdOff < 0) return [];

  const cdOffset = readUint32LE(buf, eocdOff + 16);
  const cdSize = readUint32LE(buf, eocdOff + 12);
  const totalEntries = readUint16LE(buf, eocdOff + 10);

  let pos = cdOffset;
  let count = 0;
  while (pos + 46 <= buf.length && count < totalEntries && pos < cdOffset + cdSize) {
    if (buf[pos] !== 0x50 || buf[pos + 1] !== 0x4b || buf[pos + 2] !== 0x01 || buf[pos + 3] !== 0x02) break;

    const method = readUint16LE(buf, pos + 10);
    const modTime = readUint16LE(buf, pos + 12);
    const modDate = readUint16LE(buf, pos + 14);
    const compressedSize = readUint32LE(buf, pos + 20);
    const uncompressedSize = readUint32LE(buf, pos + 24);
    const fnLen = readUint16LE(buf, pos + 28);
    const extraLen = readUint16LE(buf, pos + 30);
    const commentLen = readUint16LE(buf, pos + 32);
    const name = new TextDecoder().decode(buf.slice(pos + 46, pos + 46 + fnLen));

    entries.push({
      name,
      size: uncompressedSize,
      compressedSize,
      method,
      date: dosDateToString(modDate, modTime),
    });

    pos += 46 + fnLen + extraLen + commentLen;
    count++;
  }

  return entries;
}
