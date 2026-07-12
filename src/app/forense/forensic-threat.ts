import type { ZipEntry, PolyglotResult, PolyglotIndicator, OfficeMacroCheck } from "./forensic-types";

const MAX_SCAN_BYTES = 50 * 1024 * 1024; // 50 MB — bound worst-case scan cost on huge files

interface EmbeddedSignature {
  bytes: number[];
  label: string;
}

const EMBEDDED_EXECUTABLE_SIGNATURES: EmbeddedSignature[] = [
  { bytes: [0x4d, 0x5a], label: "PE (MZ)" },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], label: "ELF" },
  { bytes: [0xce, 0xfa, 0xed, 0xfe], label: "Mach-O (32-bit)" },
  { bytes: [0xcf, 0xfa, 0xed, 0xfe], label: "Mach-O (64-bit)" },
  { bytes: [0xfe, 0xed, 0xfa, 0xce], label: "Mach-O (32-bit, BE)" },
  { bytes: [0xfe, 0xed, 0xfa, 0xcf], label: "Mach-O (64-bit, BE)" },
];

const EXECUTABLE_PRIMARY_TYPES = new Set([
  "PE (Windows EXE/DLL)", "ELF (Linux executable)", "Mach-O (32-bit)", "Mach-O (64-bit)", "Java Class",
]);

export function scanEmbeddedExecutables(buf: Uint8Array, primaryDetectedType: string): PolyglotResult {
  const indicators: PolyglotIndicator[] = [];

  if (!EXECUTABLE_PRIMARY_TYPES.has(primaryDetectedType)) {
    const scanLen = Math.min(buf.length, MAX_SCAN_BYTES);
    // Skip offset 0 — that's already covered by the primary signature detection.
    outer: for (let i = 1; i < scanLen; i++) {
      for (const sig of EMBEDDED_EXECUTABLE_SIGNATURES) {
        if (i + sig.bytes.length > scanLen) continue;
        let matched = true;
        for (let j = 0; j < sig.bytes.length; j++) {
          if (buf[i + j] !== sig.bytes[j]) { matched = false; break; }
        }
        if (matched) {
          indicators.push({
            id: `embedded_${sig.label}_${i}`,
            label: `Assinatura de executável embutida (${sig.label})`,
            offset: i,
            detail: `Bytes de assinatura de ${sig.label} encontrados no offset ${i}, dentro de um arquivo do tipo "${primaryDetectedType}".`,
            severity: "danger",
          });
          if (indicators.length >= 10) break outer;
        }
      }
    }
    if (scanLen < buf.length) {
      indicators.push({
        id: "scan_truncated",
        label: "Varredura de executáveis embutidos limitada",
        offset: scanLen,
        detail: `Varredura limitada aos primeiros ${Math.round(MAX_SCAN_BYTES / (1024 * 1024))} MB do arquivo.`,
        severity: "warning",
      });
    }
  }

  // ZIP-specific: data preceding the PK signature suggests an SFX/polyglot layout.
  if (buf.length >= 4) {
    const hasEocd = findEocd(buf) >= 0;
    if (hasEocd && !(buf[0] === 0x50 && buf[1] === 0x4b)) {
      indicators.push({
        id: "zip_prepended_data",
        label: "Dados não-ZIP antes da estrutura ZIP",
        offset: 0,
        detail: "O arquivo contém uma estrutura ZIP válida, mas ela não começa no offset 0 — padrão típico de arquivos autoextraíveis (SFX) ou polyglot.",
        severity: "warning",
      });
    }
  }

  return { indicators };
}

function findEocd(buf: Uint8Array): number {
  const searchStart = Math.max(0, buf.length - 65558);
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) return i;
  }
  return -1;
}

const MACRO_EXTENSIONS = new Set(["docm", "xlsm", "pptm", "xlsb", "dotm", "xltm", "potm"]);
const VBA_MARKER_TOKENS = ["VBAProject", "ThisDocument", "Attribut", "VBA"];

export function detectOfficeMacros(
  entries: ZipEntry[] | undefined,
  fileName: string,
  strings: string[] | undefined,
): OfficeMacroCheck | undefined {
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";

  if (MACRO_EXTENSIONS.has(ext)) {
    return { detected: true, confidence: "high", source: `Extensão de arquivo macro-habilitada (.${ext})` };
  }

  if (entries) {
    const vbaEntry = entries.find(e => /vbaproject\.bin$/i.test(e.name));
    if (vbaEntry) {
      return { detected: true, confidence: "high", source: `Entrada "${vbaEntry.name}" encontrada no arquivo` };
    }
  }

  if (strings && (ext === "doc" || ext === "xls" || ext === "ppt")) {
    const found = VBA_MARKER_TOKENS.find(token => strings.some(s => s.includes(token)));
    if (found) {
      return { detected: true, confidence: "low", source: `Token "${found}" encontrado nas strings extraídas` };
    }
  }

  return undefined;
}
