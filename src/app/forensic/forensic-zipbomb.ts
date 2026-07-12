import type { ZipEntry, ZipBombCheck, ZipBombEntryFlag, ZipBombSeverity } from "./forensic-types";

const RATIO_WARNING = 100;
const RATIO_DANGER = 1000;
const TOTAL_SIZE_WARNING = 1 * 1024 ** 3; // 1 GB
const TOTAL_SIZE_DANGER = 10 * 1024 ** 3; // 10 GB
const ENTRY_COUNT_WARNING = 10_000;
const ENTRY_COUNT_DANGER = 100_000;
const NESTED_RATIO_WARNING = 0.3;
const NESTED_RATIO_DANGER = 0.7;
const NESTED_MIN_ENTRIES = 4;
const PATH_DEPTH_WARNING = 10;
const PATH_DEPTH_DANGER = 20;
const MAX_SUSPICIOUS_ENTRIES = 25;

const NESTED_ARCHIVE_RE = /\.(zip|rar|7z|gz|bz2|xz|tar|jar)$/i;

function entryRatio(e: ZipEntry): number {
  if (e.compressedSize <= 0) return e.size > 0 ? Infinity : 0;
  return e.size / e.compressedSize;
}

function pathDepth(name: string): number {
  return name.split("/").filter(Boolean).length;
}

function severityRank(s: ZipBombSeverity): number {
  return s === "danger" ? 2 : s === "warning" ? 1 : 0;
}

function worse(a: ZipBombSeverity, b: ZipBombSeverity): ZipBombSeverity {
  return severityRank(b) > severityRank(a) ? b : a;
}

export function analyzeZipBomb(entries: ZipEntry[], fileSize: number): ZipBombCheck {
  const details: string[] = [];
  let severity: ZipBombSeverity = "ok";

  const entryCount = entries.length;
  const totalUncompressedSize = entries.reduce((s, e) => s + e.size, 0);
  const totalCompressedSize = entries.reduce((s, e) => s + e.compressedSize, 0);
  const overallRatio = fileSize > 0 ? totalUncompressedSize / fileSize : 0;

  const suspiciousEntries: ZipBombEntryFlag[] = [];
  let maxEntryRatio = 0;
  let maxPathDepth = 0;
  let nestedArchiveCount = 0;

  for (const e of entries) {
    const ratio = entryRatio(e);
    if (ratio > maxEntryRatio) maxEntryRatio = ratio;

    const depth = pathDepth(e.name);
    if (depth > maxPathDepth) maxPathDepth = depth;

    if (NESTED_ARCHIVE_RE.test(e.name)) nestedArchiveCount++;

    if (e.method === 0 && e.compressedSize !== e.size) {
      suspiciousEntries.push({
        name: e.name, ratio, uncompressedSize: e.size, compressedSize: e.compressedSize,
        reason: "inconsistent_stored",
      });
    } else if (ratio > RATIO_WARNING) {
      suspiciousEntries.push({
        name: e.name, ratio, uncompressedSize: e.size, compressedSize: e.compressedSize,
        reason: "high_ratio",
      });
    } else if (depth > PATH_DEPTH_WARNING) {
      suspiciousEntries.push({
        name: e.name, ratio, uncompressedSize: e.size, compressedSize: e.compressedSize,
        reason: "deep_path",
      });
    }
  }

  suspiciousEntries.sort((a, b) => b.ratio - a.ratio);
  const cappedSuspicious = suspiciousEntries.slice(0, MAX_SUSPICIOUS_ENTRIES);

  const inconsistentStoredCount = entries.filter(e => e.method === 0 && e.compressedSize !== e.size).length;
  if (inconsistentStoredCount > 0) {
    severity = "danger";
    details.push(
      `${inconsistentStoredCount} ${inconsistentStoredCount === 1 ? "entrada declarada" : "entradas declaradas"} como "Stored" (sem compressão) mas com tamanho comprimido/descomprimido diferente — inconsistência física nos metadados.`,
    );
  }

  if (maxEntryRatio > RATIO_DANGER) {
    severity = worse(severity, "danger");
    details.push(`Taxa de compressão de até ${Math.round(maxEntryRatio).toLocaleString("pt-BR")}:1 em uma entrada — muito acima do normal (>1000:1), padrão típico de zip bomb.`);
  } else if (maxEntryRatio > RATIO_WARNING) {
    severity = worse(severity, "warning");
    details.push(`Taxa de compressão de até ${Math.round(maxEntryRatio).toLocaleString("pt-BR")}:1 em uma entrada — suspeita (>100:1).`);
  }

  if (overallRatio > RATIO_DANGER) {
    severity = worse(severity, "danger");
    details.push(`Tamanho descomprimido total declarado (${formatSize(totalUncompressedSize)}) é ~${Math.round(overallRatio).toLocaleString("pt-BR")}× maior que o arquivo original (${formatSize(fileSize)}).`);
  } else if (overallRatio > RATIO_WARNING) {
    severity = worse(severity, "warning");
    details.push(`Tamanho descomprimido total declarado (${formatSize(totalUncompressedSize)}) é ~${Math.round(overallRatio).toLocaleString("pt-BR")}× maior que o arquivo original (${formatSize(fileSize)}).`);
  }

  if (totalUncompressedSize > TOTAL_SIZE_DANGER) {
    severity = worse(severity, "danger");
    details.push(`Tamanho descomprimido total declarado é extremamente alto (${formatSize(totalUncompressedSize)}).`);
  } else if (totalUncompressedSize > TOTAL_SIZE_WARNING) {
    severity = worse(severity, "warning");
    details.push(`Tamanho descomprimido total declarado é alto (${formatSize(totalUncompressedSize)}).`);
  }

  if (entryCount > ENTRY_COUNT_DANGER) {
    severity = worse(severity, "danger");
    details.push(`Número de entradas extremamente alto (${entryCount.toLocaleString("pt-BR")}).`);
  } else if (entryCount > ENTRY_COUNT_WARNING) {
    severity = worse(severity, "warning");
    details.push(`Número de entradas alto (${entryCount.toLocaleString("pt-BR")}).`);
  }

  const nestedArchiveRatio = entryCount > 0 ? nestedArchiveCount / entryCount : 0;
  if (entryCount >= NESTED_MIN_ENTRIES && nestedArchiveRatio > NESTED_RATIO_DANGER) {
    severity = worse(severity, "danger");
    details.push(`${Math.round(nestedArchiveRatio * 100)}% das entradas são arquivos compactados aninhados (.zip/.rar/.7z/...) — padrão típico de bomba recursiva (ex: 42.zip).`);
  } else if (entryCount >= NESTED_MIN_ENTRIES && nestedArchiveRatio > NESTED_RATIO_WARNING) {
    severity = worse(severity, "warning");
    details.push(`${Math.round(nestedArchiveRatio * 100)}% das entradas são arquivos compactados aninhados (.zip/.rar/.7z/...) — possível padrão de bomba recursiva.`);
  }

  if (maxPathDepth > PATH_DEPTH_DANGER) {
    severity = worse(severity, "danger");
    details.push(`Profundidade de caminho incomum detectada (${maxPathDepth} níveis).`);
  } else if (maxPathDepth > PATH_DEPTH_WARNING) {
    severity = worse(severity, "warning");
    details.push(`Profundidade de caminho incomum detectada (${maxPathDepth} níveis).`);
  }

  if (details.length === 0) {
    details.push(`${entryCount} ${entryCount === 1 ? "entrada analisada" : "entradas analisadas"} — nenhum padrão suspeito de zip bomb encontrado.`);
  }

  return {
    severity,
    entryCount,
    totalUncompressedSize,
    totalCompressedSize,
    overallRatio,
    maxEntryRatio,
    nestedArchiveCount,
    nestedArchiveRatio,
    maxPathDepth,
    suspiciousEntries: cappedSuspicious,
    details,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let val = bytes;
  let i = -1;
  do { val /= 1024; i++; } while (val >= 1024 && i < units.length - 1);
  return `${val.toFixed(1)} ${units[i]}`;
}
