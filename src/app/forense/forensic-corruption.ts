import type { CorruptionCheck } from "./forensic-types";

// ─── CRC32 lookup table (for PNG chunk verification) ──────────────────────────

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of data) crc = CRC32_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── JPEG ─────────────────────────────────────────────────────────────────────
//
// JPEG structure: SOI (FF D8) → segments → EOI (FF D9)
// Each segment (except SOI, EOI, RST0-7, TEM): FF <marker> <2-byte big-endian length>
// The length field includes its own 2 bytes, so data size = length - 2.
// After SOS (FF DA) comes the entropy-coded scan data — stop structured parsing there.

const JPEG_MARKERS_NO_LENGTH = new Set([
  0xd8, // SOI
  0xd9, // EOI
  0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, // RST0–RST7
  0x01, // TEM
]);

function checkJpeg(buf: Uint8Array): CorruptionCheck {
  const errors: string[] = [];

  // Mandatory SOI
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    return { status: "corrupted", details: ["SOI (FF D8) ausente — não é um JPEG válido"] };
  }

  // EOI anywhere in the last 4 bytes (some encoders add trailing bytes after EOI)
  let hasEoi = false;
  for (let i = buf.length - 1; i >= Math.max(1, buf.length - 4); i--) {
    if (buf[i - 1] === 0xff && buf[i] === 0xd9) { hasEoi = true; break; }
  }
  if (!hasEoi) errors.push("EOI (FF D9) ausente — arquivo provavelmente truncado");

  // Walk segments
  let pos = 2;
  let segCount = 0;

  while (pos < buf.length - 1) {
    // A valid marker starts with FF; multiple FFs are valid padding before the marker byte
    if (buf[pos] !== 0xff) {
      errors.push(`Byte inesperado 0x${buf[pos].toString(16).toUpperCase()} na posição ${pos} (esperado 0xFF)`);
      break;
    }
    // Skip padding FFs
    while (pos < buf.length && buf[pos] === 0xff) pos++;
    if (pos >= buf.length) break;

    const marker = buf[pos++];
    if (marker === 0x00) continue; // byte-stuffed 0xFF 0x00, skip

    // EOI — end of image, stop
    if (marker === 0xd9) break;

    // Markers without a length field
    if (JPEG_MARKERS_NO_LENGTH.has(marker)) continue;

    // Read 2-byte big-endian length (includes its own 2 bytes)
    if (pos + 2 > buf.length) {
      errors.push(`Segmento 0xFF${marker.toString(16).toUpperCase()} na posição ${pos - 1}: sem bytes suficientes para o campo de comprimento`);
      break;
    }
    const segLen = (buf[pos] << 8) | buf[pos + 1];
    if (segLen < 2) {
      errors.push(`Segmento 0xFF${marker.toString(16).toUpperCase()}: comprimento inválido (${segLen})`);
      break;
    }
    const segEnd = pos + segLen;
    if (segEnd > buf.length) {
      errors.push(`Segmento 0xFF${marker.toString(16).toUpperCase()} na posição ${pos - 1}: comprimento ${segLen} excede o tamanho do arquivo`);
      break;
    }
    pos = segEnd;
    segCount++;

    // SOS — entropy-coded data follows; stop structured parsing
    if (marker === 0xda) break;
  }

  if (errors.length > 0) {
    return {
      status: hasEoi ? "warning" : "corrupted",
      details: errors,
    };
  }
  return {
    status: "ok",
    details: [
      `${segCount} segmento${segCount !== 1 ? "s" : ""} analisado${segCount !== 1 ? "s" : ""} sem erros`,
      "Marcador EOI presente — arquivo completo",
    ],
  };
}

// ─── PNG ──────────────────────────────────────────────────────────────────────
//
// PNG structure: 8-byte signature → chunks until IEND
// Each chunk: 4-byte data length (BE) + 4-byte type + <length> bytes data + 4-byte CRC32
// CRC32 covers type + data (not the length field itself).

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function checkPng(buf: Uint8Array): CorruptionCheck {
  // Signature
  if (buf.length < 8 || !PNG_SIGNATURE.every((b, i) => buf[i] === b)) {
    return { status: "corrupted", details: ["Assinatura PNG inválida (primeiros 8 bytes incorretos)"] };
  }

  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const errors: string[] = [];
  const crcErrors: string[] = [];
  let pos = 8;
  let chunkCount = 0;
  let hasIhdr = false;
  let hasIend = false;

  while (pos + 12 <= buf.length) {
    const dataLen = dv.getUint32(pos, false); // big-endian
    if (dataLen > 0x7fffffff) {
      errors.push(`Chunk na posição ${pos}: comprimento inválido (${dataLen})`);
      break;
    }
    if (pos + 12 + dataLen > buf.length) {
      const type = new TextDecoder().decode(buf.slice(pos + 4, pos + 8));
      errors.push(`Chunk "${type}" na posição ${pos}: comprimento ${dataLen} excede o tamanho do arquivo (truncado)`);
      break;
    }

    const typeBytes = buf.slice(pos + 4, pos + 8);
    const type = new TextDecoder().decode(typeBytes);

    // CRC32 verification: covers type (4 bytes) + data (dataLen bytes)
    const crcInput = buf.slice(pos + 4, pos + 8 + dataLen);
    const computed = crc32(crcInput);
    const stored = dv.getUint32(pos + 8 + dataLen, false);
    if (computed !== stored) {
      crcErrors.push(
        `CRC32 inválido no chunk "${type}" (posição ${pos}): ` +
        `calculado 0x${computed.toString(16).toUpperCase()}, ` +
        `armazenado 0x${stored.toString(16).toUpperCase()}`
      );
    }

    if (type === "IHDR") hasIhdr = true;
    if (type === "IEND") { hasIend = true; break; }

    pos += 12 + dataLen;
    chunkCount++;
    if (chunkCount > 100_000) { errors.push("Número de chunks excede o limite de segurança"); break; }
  }

  if (!hasIhdr) errors.push("Chunk IHDR ausente (obrigatório como primeiro chunk)");
  if (!hasIend) errors.push("Chunk IEND ausente — arquivo provavelmente truncado");

  const allErrors = [...errors, ...crcErrors];
  if (allErrors.length > 0) {
    return {
      status: crcErrors.length > 0 ? "corrupted" : "warning",
      details: allErrors,
    };
  }
  return {
    status: "ok",
    details: [
      `${chunkCount + 1} chunk${chunkCount !== 0 ? "s" : ""} analisado${chunkCount !== 0 ? "s" : ""}, todos os CRC32 corretos`,
      "Chunks IHDR e IEND presentes — estrutura íntegra",
    ],
  };
}

// ─── ZIP ──────────────────────────────────────────────────────────────────────
//
// Validation strategy:
// 1. Find the End of Central Directory (EOCD) record at the end of the file.
// 2. Read the central directory and for each entry verify that the local
//    file header at the declared offset has the correct signature and
//    matching filename length (to catch offset corruption).

function readU16LE(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8);
}
function readU32LE(buf: Uint8Array, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0;
}

function checkZip(buf: Uint8Array): CorruptionCheck {
  // Find EOCD (search from the end, comment can be up to 65535 bytes)
  let eocdOff = -1;
  const searchStart = Math.max(0, buf.length - 65558);
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocdOff = i;
      break;
    }
  }
  if (eocdOff < 0) {
    return { status: "corrupted", details: ["Registro EOCD (End of Central Directory) não encontrado — arquivo não é um ZIP válido ou está corrompido no final"] };
  }

  const totalEntries = readU16LE(buf, eocdOff + 10);
  const cdSize = readU32LE(buf, eocdOff + 12);
  const cdOffset = readU32LE(buf, eocdOff + 16);

  if (cdOffset + cdSize > buf.length) {
    return {
      status: "corrupted",
      details: [`Diretório central declarado no offset ${cdOffset} com tamanho ${cdSize}, mas o arquivo tem apenas ${buf.length} bytes`],
    };
  }

  const errors: string[] = [];
  let pos = cdOffset;
  let verified = 0;

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buf.length) {
      errors.push(`Entrada ${i}: diretório central truncado (offset ${pos})`);
      break;
    }
    // Central directory file header signature: PK\x01\x02
    if (buf[pos] !== 0x50 || buf[pos + 1] !== 0x4b || buf[pos + 2] !== 0x01 || buf[pos + 3] !== 0x02) {
      errors.push(`Entrada ${i}: assinatura inválida no diretório central (offset ${pos})`);
      break;
    }

    const fnLenCD = readU16LE(buf, pos + 28);
    const extraLen = readU16LE(buf, pos + 30);
    const commentLen = readU16LE(buf, pos + 32);
    const localOff = readU32LE(buf, pos + 42);

    const fname = fnLenCD > 0 && pos + 46 + fnLenCD <= buf.length
      ? new TextDecoder().decode(buf.slice(pos + 46, pos + 46 + fnLenCD))
      : `<entrada ${i}>`;

    // Verify local file header at declared offset
    if (localOff + 30 > buf.length) {
      errors.push(`"${fname}": offset local ${localOff} está fora dos limites do arquivo`);
    } else if (buf[localOff] !== 0x50 || buf[localOff + 1] !== 0x4b || buf[localOff + 2] !== 0x03 || buf[localOff + 3] !== 0x04) {
      errors.push(`"${fname}": assinatura do header local inválida no offset ${localOff} (esperado PK\\x03\\x04)`);
    } else {
      // Cross-check filename length between central and local headers
      const fnLenLocal = readU16LE(buf, localOff + 26);
      if (fnLenLocal !== fnLenCD) {
        errors.push(`"${fname}": comprimento do nome difere entre diretório central (${fnLenCD}) e header local (${fnLenLocal})`);
      }
    }

    pos += 46 + fnLenCD + extraLen + commentLen;
    verified++;
  }

  if (errors.length > 0) {
    return { status: "corrupted", details: errors };
  }
  return {
    status: "ok",
    details: [`${verified} ${verified === 1 ? "entrada verificada" : "entradas verificadas"} — estrutura ZIP íntegra`],
  };
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function checkPdf(buf: Uint8Array): Promise<CorruptionCheck> {
  // Header
  const header = new TextDecoder("latin1").decode(buf.slice(0, 8));
  if (!header.startsWith("%PDF-")) {
    return { status: "corrupted", details: ["Cabeçalho %PDF- ausente"] };
  }

  // %%EOF (search last 1 KB to handle trailing whitespace/newlines)
  const tail = new TextDecoder("latin1").decode(buf.slice(Math.max(0, buf.length - 1024)));
  if (!tail.includes("%%EOF")) {
    return {
      status: "warning",
      details: ["Marcador %%EOF ausente — o arquivo pode estar truncado"],
    };
  }

  // Full parse via pdfjs-dist (already a dependency)
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const pages = doc.numPages;
    return {
      status: "ok",
      details: [
        `Parse completo bem-sucedido (${pages} ${pages === 1 ? "página" : "páginas"})`,
        "Cabeçalho %PDF- e marcador %%EOF presentes",
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("password")) {
      return {
        status: "unknown",
        details: ["PDF protegido por senha — estrutura interna não pode ser verificada sem a chave"],
      };
    }
    return {
      status: "corrupted",
      details: [`Falha no parse do PDF: ${msg}`],
    };
  }
}

// ─── Generic image — render via canvas ────────────────────────────────────────

function checkImageViaCanvas(file: File): Promise<CorruptionCheck> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => URL.revokeObjectURL(url);

    img.onload = () => {
      cleanup();
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        resolve({ status: "corrupted", details: ["Imagem carregou mas tem dimensões zero (decodificação falhou)"] });
      } else {
        resolve({
          status: "ok",
          details: [`Imagem decodificada com sucesso pelo navegador (${img.naturalWidth}×${img.naturalHeight}px)`],
        });
      }
    };
    img.onerror = () => {
      cleanup();
      resolve({ status: "corrupted", details: ["Navegador não conseguiu decodificar a imagem — possivelmente corrompida"] });
    };
    img.src = url;
  });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function checkCorruption(file: File, buf: Uint8Array): Promise<CorruptionCheck> {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // JPEG: structural parse + canvas render
  if (mime.includes("jpeg") || mime.includes("jpg") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    const structural = checkJpeg(buf);
    if (structural.status === "ok") {
      // Canvas render as secondary confirmation
      const canvas = await checkImageViaCanvas(file);
      if (canvas.status !== "ok") return canvas;
    }
    return structural;
  }

  // PNG: structural parse with CRC32 + canvas render
  if (mime.includes("png") || name.endsWith(".png")) {
    const structural = checkPng(buf);
    if (structural.status === "ok") {
      const canvas = await checkImageViaCanvas(file);
      if (canvas.status !== "ok") return canvas;
    }
    return structural;
  }

  // ZIP and Office Open XML formats (DOCX/XLSX/PPTX use ZIP internally)
  if (
    mime.includes("zip") ||
    /\.(zip|docx|xlsx|pptx|odt|ods|odp)$/i.test(name)
  ) {
    if (buf[0] === 0x50 && buf[1] === 0x4b) return checkZip(buf);
    return { status: "unknown", details: ["Magic bytes ZIP (PK) não encontrados no início do arquivo"] };
  }

  // PDF
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return checkPdf(buf);
  }

  // Any other image type — canvas-only check
  if (mime.startsWith("image/") || /\.(webp|tiff?|bmp|gif|heic|avif)$/i.test(name)) {
    return checkImageViaCanvas(file);
  }

  return {
    status: "unknown",
    details: ["Verificação de integridade estrutural não disponível para este tipo de arquivo"],
  };
}
