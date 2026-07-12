import type { BasicInfo, SignatureResult, EntropyRegionResult } from "./forensic-types";

// ─── MD5 (pure JS) ────────────────────────────────────────────────────────────

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = (() => {
  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i++) k[i] = (Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  return k;
})();

export function md5(input: Uint8Array): string {
  const msgLen = input.length;
  const bitLen = msgLen * 8;
  const padLen = msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(input);
  padded[msgLen] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(msgLen + padLen, bitLen >>> 0, true);
  dv.setUint32(msgLen + padLen + 4, Math.floor(bitLen / 2 ** 32), true);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  for (let i = 0; i < padded.length; i += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(i + j * 4, true);
    let A = a, B = b, C = c, D = d;
    for (let j = 0; j < 64; j++) {
      let F: number, g: number;
      if (j < 16) { F = (B & C) | (~B & D); g = j; }
      else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
      else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * j) % 16; }
      const tmp = D; D = C; C = B;
      const sum = (A + F + MD5_K[j] + M[g]) >>> 0;
      B = (B + ((sum << MD5_S[j]) | (sum >>> (32 - MD5_S[j])))) >>> 0;
      A = tmp;
    }
    a = (a + A) >>> 0; b = (b + B) >>> 0;
    c = (c + C) >>> 0; d = (d + D) >>> 0;
  }

  const out = new DataView(new ArrayBuffer(16));
  out.setUint32(0, a, true); out.setUint32(4, b, true);
  out.setUint32(8, c, true); out.setUint32(12, d, true);
  return Array.from(new Uint8Array(out.buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── SHA-1 / SHA-256 ──────────────────────────────────────────────────────────

async function shaHex(buf: ArrayBuffer, algo: "SHA-1" | "SHA-256"): Promise<string> {
  const digest = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Shannon Entropy ──────────────────────────────────────────────────────────

export function computeEntropy(data: Uint8Array): number {
  const freq = new Float64Array(256);
  for (const byte of data) freq[byte]++;
  let entropy = 0;
  for (const f of freq) {
    if (f === 0) continue;
    const p = f / data.length;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

// ─── Entropy by region — catches a small encrypted/packed payload hidden ──────
// inside an otherwise normal-entropy file, which the whole-file average misses.

const ENTROPY_MAX_WINDOWS = 4000;
const ENTROPY_HIGH_THRESHOLD = 7.5;
const ENTROPY_OVERALL_LOW_CUTOFF = 6.5;

export function analyzeEntropyRegions(data: Uint8Array, overallEntropy: number, windowSize = 4096): EntropyRegionResult {
  const effectiveWindowSize = data.length / windowSize > ENTROPY_MAX_WINDOWS
    ? Math.ceil(data.length / ENTROPY_MAX_WINDOWS)
    : windowSize;

  const windows: { offset: number; entropy: number }[] = [];
  for (let off = 0; off < data.length; off += effectiveWindowSize) {
    const chunk = data.subarray(off, Math.min(off + effectiveWindowSize, data.length));
    if (chunk.length === 0) continue;
    windows.push({ offset: off, entropy: computeEntropy(chunk) });
  }

  let maxWindowEntropy = 0;
  const highEntropyRegions: EntropyRegionResult["highEntropyRegions"] = [];
  let current: { offsetStart: number; offsetEnd: number; entropy: number } | null = null;

  for (const w of windows) {
    if (w.entropy > maxWindowEntropy) maxWindowEntropy = w.entropy;
    if (w.entropy > ENTROPY_HIGH_THRESHOLD) {
      const end = Math.min(w.offset + effectiveWindowSize, data.length);
      if (current && w.offset <= current.offsetEnd) {
        current.offsetEnd = end;
        current.entropy = Math.max(current.entropy, w.entropy);
      } else {
        if (current) highEntropyRegions.push(current);
        current = { offsetStart: w.offset, offsetEnd: end, entropy: w.entropy };
      }
    }
  }
  if (current) highEntropyRegions.push(current);

  const highEntropyCoverage = highEntropyRegions.reduce((s, r) => s + (r.offsetEnd - r.offsetStart), 0) / Math.max(1, data.length);
  const suspicious = maxWindowEntropy > ENTROPY_HIGH_THRESHOLD &&
    (overallEntropy < ENTROPY_OVERALL_LOW_CUTOFF || highEntropyCoverage < 0.3);

  return {
    windowSize: effectiveWindowSize,
    maxWindowEntropy,
    highEntropyRegions: highEntropyRegions.slice(0, 20),
    suspicious,
  };
}

// ─── Magic Bytes Table ────────────────────────────────────────────────────────

interface MagicEntry {
  bytes: number[];
  type: string;
}

const MAGIC_TABLE: MagicEntry[] = [
  { bytes: [0xff, 0xd8, 0xff], type: "JPEG" },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], type: "PNG" },
  { bytes: [0x47, 0x49, 0x46, 0x38], type: "GIF" },
  { bytes: [0x52, 0x49, 0x46, 0x46], type: "RIFF (WebP/AVI/WAV)" },
  { bytes: [0x25, 0x50, 0x44, 0x46], type: "PDF" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], type: "ZIP/DOCX/XLSX/PPTX" },
  { bytes: [0x50, 0x4b, 0x05, 0x06], type: "ZIP (empty)" },
  { bytes: [0x49, 0x44, 0x33], type: "MP3 (ID3)" },
  { bytes: [0xff, 0xfb], type: "MP3" },
  { bytes: [0xff, 0xf3], type: "MP3" },
  { bytes: [0xff, 0xf2], type: "MP3" },
  { bytes: [0x66, 0x4c, 0x61, 0x43], type: "FLAC" },
  { bytes: [0x4f, 0x67, 0x67, 0x53], type: "OGG" },
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], type: "WebM/MKV" },
  { bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], type: "MP4/M4A" },
  { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], type: "MP4" },
  { bytes: [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70], type: "MP4" },
  { bytes: [0x38, 0x42, 0x50, 0x53], type: "PSD" },
  { bytes: [0x49, 0x49, 0x2a, 0x00], type: "TIFF (LE)" },
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], type: "TIFF (BE)" },
  { bytes: [0x42, 0x4d], type: "BMP" },
  { bytes: [0x7b, 0x5c, 0x72, 0x74, 0x66], type: "RTF" },
  { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], type: "DOC/XLS/PPT (OLE)" },
  { bytes: [0x1f, 0x8b], type: "GZIP" },
  { bytes: [0x42, 0x5a, 0x68], type: "BZIP2" },
  { bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], type: "7-ZIP" },
  { bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], type: "XZ" },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], type: "ELF (Linux executable)" },
  { bytes: [0x4d, 0x5a], type: "PE (Windows EXE/DLL)" },
  { bytes: [0xca, 0xfe, 0xba, 0xbe], type: "Java Class" },
  { bytes: [0xce, 0xfa, 0xed, 0xfe], type: "Mach-O (32-bit)" },
  { bytes: [0xcf, 0xfa, 0xed, 0xfe], type: "Mach-O (64-bit)" },
];

export function detectSignature(data: Uint8Array, declaredMime: string, declaredExt?: string): SignatureResult {
  const hex = Array.from(data.slice(0, 16)).map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  for (const entry of MAGIC_TABLE) {
    if (entry.bytes.every((b, i) => data[i] === b)) {
      const match = matchesMime(entry.type, declaredMime);
      const extensionMatch = matchesExtension(entry.type, declaredExt ?? "");
      return { detectedType: entry.type, declaredType: declaredMime || "unknown", match, extensionMatch, magicBytes: hex };
    }
  }
  return { detectedType: "Unknown", declaredType: declaredMime || "unknown", match: true, extensionMatch: true, magicBytes: hex };
}

// Signature types that should never legitimately match a "safe" declared MIME —
// executables/archives disguised behind an image/document extension are exactly
// what a magic-byte/MIME mismatch check should catch.
const EXECUTABLE_LIKE_TYPES = new Set([
  "PE (Windows EXE/DLL)",
  "ELF (Linux executable)",
  "Mach-O (32-bit)",
  "Mach-O (64-bit)",
  "Java Class",
]);

function matchesMime(detected: string, mime: string): boolean {
  const m = mime.toLowerCase();
  if (detected === "JPEG") return m.includes("jpeg") || m.includes("jpg");
  if (detected === "PNG") return m.includes("png");
  if (detected === "GIF") return m.includes("gif");
  if (detected === "PDF") return m.includes("pdf");
  if (detected.startsWith("ZIP")) return m.includes("zip") || m.includes("docx") || m.includes("xlsx") || m.includes("pptx") || m.includes("odt");
  if (detected.startsWith("MP3")) return m.includes("mp3") || m.includes("mpeg");
  if (detected === "FLAC") return m.includes("flac");
  if (detected === "OGG") return m.includes("ogg");
  if (detected.startsWith("MP4")) return m.includes("mp4");
  if (detected === "RIFF (WebP/AVI/WAV)") return m.includes("webp") || m.includes("avi") || m.includes("wav");
  if (detected.startsWith("TIFF")) return m.includes("tiff") || m.includes("tif");
  if (detected === "BMP") return m.includes("bmp");
  if (detected === "WebM/MKV") return m.includes("webm") || m.includes("matroska");
  if (EXECUTABLE_LIKE_TYPES.has(detected)) {
    return m.includes("msdownload") || m.includes("x-executable") || m.includes("x-elf") ||
      m.includes("java-vm") || m.includes("java-archive") || m.includes("octet-stream");
  }
  return true;
}

const EXECUTABLE_EXTENSIONS = new Set(["exe", "dll", "sys", "scr", "com", "msi"]);
const OLE_EXTENSIONS = new Set(["doc", "xls", "ppt", "msi", "msg"]);
const ZIP_LIKE_EXTENSIONS = new Set(["zip", "docx", "xlsx", "pptx", "docm", "xlsm", "pptm", "odt", "ods", "odp", "jar", "apk"]);

function matchesExtension(detected: string, ext: string): boolean {
  const e = ext.toLowerCase();
  if (detected === "PE (Windows EXE/DLL)") return EXECUTABLE_EXTENSIONS.has(e);
  if (detected === "ELF (Linux executable)") return e === "" || e === "elf" || e === "bin" || e === "so";
  if (detected === "Mach-O (32-bit)" || detected === "Mach-O (64-bit)") return e === "" || e === "dylib" || e === "bin";
  if (detected === "Java Class") return e === "class";
  if (detected === "DOC/XLS/PPT (OLE)") return OLE_EXTENSIONS.has(e);
  if (detected.startsWith("ZIP")) return ZIP_LIKE_EXTENSIONS.has(e);
  // No strong extension expectation for this signature — don't flag it.
  return true;
}

// ─── String Extraction ────────────────────────────────────────────────────────

export function extractStrings(data: Uint8Array, minLen = 4): string[] {
  const results: string[] = [];
  let current = "";
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= minLen) results.push(current);
      current = "";
    }
  }
  if (current.length >= minLen) results.push(current);
  return results.slice(0, 1000);
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export async function computeBasicInfo(file: File, buffer: ArrayBuffer): Promise<BasicInfo> {
  const u8 = new Uint8Array(buffer);
  const [sha1, sha256] = await Promise.all([shaHex(buffer, "SHA-1"), shaHex(buffer, "SHA-256")]);
  const md5hash = md5(u8);
  const entropy = computeEntropy(u8);
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  const signature = detectSignature(u8, file.type, ext);

  return {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    extension: ext,
    lastModified: new Date(file.lastModified),
    sha1,
    sha256,
    md5: md5hash,
    entropy,
    signature,
  };
}
