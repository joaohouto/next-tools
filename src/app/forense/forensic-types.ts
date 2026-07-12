export type ProcessingStatus = "idle" | "processing" | "done" | "error";

export interface SignatureResult {
  detectedType: string;
  declaredType: string;
  match: boolean;
  extensionMatch: boolean;
  magicBytes: string;
}

export interface BasicInfo {
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: Date;
  sha1: string;
  sha256: string;
  md5: string;
  entropy: number;
  signature: SignatureResult;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface ExifData {
  make?: string;
  model?: string;
  serialNumber?: string;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
  flash?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  dateTime?: string;
  width?: number;
  height?: number;
  orientation?: number;
  xResolution?: number;
  yResolution?: number;
  colorSpace?: string;
  software?: string;
  thumbnail?: string;
  gps?: GpsData;
  xmp?: Record<string, unknown>;
  iptc?: Record<string, unknown>;
}

export interface PdfMeta {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  subject?: string;
  keywords?: string;
  creationDate?: string;
  modDate?: string;
  pageCount?: number;
  version?: string;
  encrypted?: boolean;
}

export interface OfficeMeta {
  title?: string;
  creator?: string;
  lastModifiedBy?: string;
  revision?: string;
  created?: string;
  modified?: string;
  description?: string;
  keywords?: string;
}

export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  coverUrl?: string;
}

export interface MediaMeta {
  duration?: number;
  width?: number;
  height?: number;
  id3?: Id3Tags;
  vorbis?: Record<string, string>;
}

export interface ZipEntry {
  name: string;
  size: number;
  compressedSize: number;
  method: number;
  date: string;
}

export type ZipBombSeverity = "ok" | "warning" | "danger";

export interface ZipBombEntryFlag {
  name: string;
  ratio: number;
  uncompressedSize: number;
  compressedSize: number;
  reason: "high_ratio" | "nested_archive" | "deep_path" | "inconsistent_stored";
}

export interface ZipBombCheck {
  severity: ZipBombSeverity;
  entryCount: number;
  totalUncompressedSize: number;
  totalCompressedSize: number;
  overallRatio: number;
  maxEntryRatio: number;
  nestedArchiveCount: number;
  nestedArchiveRatio: number;
  maxPathDepth: number;
  suspiciousEntries: ZipBombEntryFlag[];
  details: string[];
}

export interface PolyglotIndicator {
  id: string;
  label: string;
  offset: number;
  detail: string;
  severity: "warning" | "danger";
}

export interface PolyglotResult {
  indicators: PolyglotIndicator[];
}

export interface OfficeMacroCheck {
  detected: boolean;
  confidence: "high" | "low";
  source: string;
}

export interface EntropyRegionResult {
  windowSize: number;
  maxWindowEntropy: number;
  highEntropyRegions: { offsetStart: number; offsetEnd: number; entropy: number }[];
  suspicious: boolean;
}

export interface RgbHistogram {
  r: number[];
  g: number[];
  b: number[];
}

export interface ImageAnalysis {
  width: number;
  height: number;
  dominantColors: string[];
  rgbDistribution: { r: number; g: number; b: number };
  histogram: RgbHistogram;
  steganography: "unlikely" | "inconclusive" | "suspicious";
}

export interface ForensicFlag {
  id: string;
  label: string;
  description: string;
  severity: "info" | "warning" | "danger";
  active: boolean;
}

export type CorruptionStatus = "ok" | "corrupted" | "warning" | "unknown";

export interface CorruptionCheck {
  status: CorruptionStatus;
  // Each entry is a human-readable detail: errors, warnings, or confirmation messages
  details: string[];
}

export interface ForensicResult {
  status: ProcessingStatus;
  file?: File;
  basic?: BasicInfo;
  exif?: ExifData;
  pdfMeta?: PdfMeta;
  officeMeta?: OfficeMeta;
  mediaMeta?: MediaMeta;
  zipEntries?: ZipEntry[];
  strings?: string[];
  imageAnalysis?: ImageAnalysis;
  ela?: import("./forensic-ela").ElaResult;
  corruption?: CorruptionCheck;
  zipBomb?: ZipBombCheck;
  polyglot?: PolyglotResult;
  officeMacros?: OfficeMacroCheck;
  entropyRegions?: EntropyRegionResult;
  privacyScore?: number;
  flags?: ForensicFlag[];
  error?: string;
}
