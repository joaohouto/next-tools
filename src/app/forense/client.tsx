"use client";

import { useState, useCallback } from "react";
import {
  Shield, ShieldAlert, ShieldCheck, MapPin, FileText, Image,
  Music, Archive, Copy, Download, RefreshCw, AlertTriangle,
  CheckCircle, Info, Fingerprint, Hash, BarChart2,
  Eye, ScanSearch, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import FileDropzone from "@/components/file-dropzone";
import { formatBytes, cn } from "@/lib/utils";
import type { ForensicResult, ForensicFlag } from "./forensic-types";
import { computeBasicInfo, extractStrings } from "./forensic-engine";
import { extractExif, analyzeImage } from "./forensic-exif";
import { extractPdfMeta } from "./forensic-pdf";
import { extractOfficeMeta } from "./forensic-office";
import { extractMediaMeta } from "./forensic-media";
import { listZipEntries } from "./forensic-zip";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|tiff?|heic|gif|bmp)$/i.test(file.name);
}
function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
function isOffice(file: File) {
  return /\.(docx|xlsx|pptx|odt|ods|odp)$/i.test(file.name);
}
function isMedia(file: File) {
  return file.type.startsWith("audio/") || file.type.startsWith("video/") ||
    /\.(mp3|flac|ogg|wav|m4a|aac|mp4|mov|avi|mkv|webm)$/i.test(file.name);
}
function isZip(file: File) {
  return file.type === "application/zip" || /\.zip$/i.test(file.name);
}

function fmtDuration(secs: number): string {
  if (!isFinite(secs) || secs <= 0) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function orientationLabel(o?: number): string {
  const labels: Record<number, string> = {
    1: "Normal", 2: "Espelhado H", 3: "180°",
    4: "Espelhado V", 5: "90° + espelho", 6: "90° direita",
    7: "270° + espelho", 8: "270° direita",
  };
  return o !== undefined ? (labels[o] ?? String(o)) : "—";
}

function orientationTransform(o?: number): string {
  const transforms: Record<number, string> = {
    2: "scaleX(-1)", 3: "rotate(180deg)", 4: "scaleY(-1)",
    5: "rotate(90deg) scaleX(-1)", 6: "rotate(90deg)",
    7: "rotate(270deg) scaleX(-1)", 8: "rotate(270deg)",
  };
  return o !== undefined ? (transforms[o] ?? "none") : "none";
}

function buildFlags(result: ForensicResult): ForensicFlag[] {
  const flags: ForensicFlag[] = [];
  const { basic, exif, pdfMeta, officeMeta, imageAnalysis } = result;

  flags.push({
    id: "gps",
    label: "Localização GPS detectada",
    description: "O arquivo contém coordenadas GPS que revelam onde foi criado.",
    severity: "danger",
    active: !!exif?.gps,
  });

  flags.push({
    id: "edit",
    label: "Evidência de edição",
    description: "A data de modificação do arquivo difere em mais de 1h da data EXIF original.",
    severity: "warning",
    active: (() => {
      if (!basic || !exif?.dateTimeOriginal) return false;
      const orig = new Date(exif.dateTimeOriginal).getTime();
      const mod = basic.lastModified.getTime();
      return !isNaN(orig) && Math.abs(mod - orig) > 3_600_000;
    })(),
  });

  flags.push({
    id: "entropy",
    label: "Alta entropia (possível criptografia/compressão)",
    description: "Entropia de Shannon acima de 7.2 sugere dados cifrados ou altamente comprimidos.",
    severity: "warning",
    active: (basic?.entropy ?? 0) > 7.2,
  });

  flags.push({
    id: "thumbnail",
    label: "Miniatura EXIF embutida",
    description: "O EXIF contém uma versão miniatura da imagem que pode revelar conteúdo original antes de edições.",
    severity: "info",
    active: !!exif?.thumbnail,
  });

  flags.push({
    id: "xmp",
    label: "Metadados XMP presentes",
    description: "O arquivo contém metadados XMP que podem incluir histórico de edição e software usado.",
    severity: "info",
    active: !!exif?.xmp,
  });

  flags.push({
    id: "iptc",
    label: "Metadados IPTC presentes",
    description: "O arquivo contém metadados IPTC com informações do fotógrafo/agência.",
    severity: "info",
    active: !!exif?.iptc,
  });

  flags.push({
    id: "pdf_encrypted",
    label: "PDF protegido por senha",
    description: "O arquivo PDF possui proteção por criptografia.",
    severity: "warning",
    active: !!pdfMeta?.encrypted,
  });

  flags.push({
    id: "sig_mismatch",
    label: "Assinatura de arquivo incompatível",
    description: "Os magic bytes não correspondem à extensão declarada — possível disfarce de tipo.",
    severity: "warning",
    active: basic?.signature.match === false && basic.signature.detectedType !== "Unknown",
  });

  flags.push({
    id: "stego",
    label: "Possível esteganografia detectada",
    description: "Distribuição estatística dos bits menos significativos é suspeita.",
    severity: "warning",
    active: imageAnalysis?.steganography === "suspicious",
  });

  flags.push({
    id: "serial",
    label: "Número de série da câmera presente",
    description: "O EXIF contém o número de série do dispositivo que capturou a imagem.",
    severity: "warning",
    active: !!exif?.serialNumber,
  });

  flags.push({
    id: "author",
    label: "Autor identificado nos metadados",
    description: "O arquivo contém nome de autor em metadados EXIF, PDF ou documento Office.",
    severity: "info",
    active: !!(exif?.make || pdfMeta?.author || officeMeta?.creator),
  });

  return flags;
}

function buildPrivacyScore(result: ForensicResult): number {
  const { exif, pdfMeta, officeMeta } = result;
  let score = 0;
  if (exif?.gps) score += 40;
  if (exif?.serialNumber) score += 15;
  if (exif?.make || exif?.model) score += 10;
  if (exif?.iptc && Object.keys(exif.iptc).length > 0) score += 10;
  if (pdfMeta?.author || officeMeta?.creator) score += 10;
  if (exif?.software) score += 5;
  if (exif?.xmp && Object.keys(exif.xmp).length > 0) score += 5;
  return Math.min(100, score);
}

// ─── Processing pipeline ──────────────────────────────────────────────────────

async function processFile(
  file: File,
  onProgress: (partial: Partial<ForensicResult>) => void,
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const u8 = new Uint8Array(buffer);

  // Phase 1: hashes + entropy + strings (parallel)
  const [basic, strings] = await Promise.all([
    computeBasicInfo(file, buffer),
    Promise.resolve(extractStrings(u8)),
  ]);
  onProgress({ basic, strings, status: "processing" });

  // Phase 2: type-specific extraction
  let exif: ForensicResult["exif"] | undefined;
  let pdfMeta: ForensicResult["pdfMeta"] | undefined;
  let officeMeta: ForensicResult["officeMeta"] | undefined;
  let mediaMeta: ForensicResult["mediaMeta"] | undefined;
  let zipEntries: ForensicResult["zipEntries"] | undefined;
  let imageAnalysis: ForensicResult["imageAnalysis"] | undefined;

  const tasks: Promise<void>[] = [];

  if (isImage(file)) {
    tasks.push(
      extractExif(file).then((e) => { exif = e; }).catch(() => {}),
      analyzeImage(file).then((a) => { imageAnalysis = a; }).catch(() => {}),
    );
  }
  if (isPdf(file)) {
    tasks.push(extractPdfMeta(file).then((m) => { pdfMeta = m; }).catch(() => {}));
  }
  if (isOffice(file)) {
    tasks.push(extractOfficeMeta(file).then((m) => { officeMeta = m; }).catch(() => {}));
  }
  if (isMedia(file)) {
    tasks.push(extractMediaMeta(file, buffer).then((m) => { mediaMeta = m; }).catch(() => {}));
  }
  if (isZip(file) || isOffice(file)) {
    tasks.push(Promise.resolve().then(() => { zipEntries = isZip(file) ? listZipEntries(u8) : undefined; }));
  }

  await Promise.allSettled(tasks);

  const partial: ForensicResult = { file, basic, strings, exif, pdfMeta, officeMeta, mediaMeta, zipEntries, imageAnalysis, status: "processing" };
  const privacyScore = buildPrivacyScore(partial);
  const flags = buildFlags(partial);
  onProgress({ exif, pdfMeta, officeMeta, mediaMeta, zipEntries, imageAnalysis, privacyScore, flags, status: "done" });
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-xs font-medium w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm break-all">{String(value)}</span>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value?: string }) {
  const copy = () => { if (value) { navigator.clipboard.writeText(value); toast.success("Hash copiado!"); } };
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-xs font-medium w-16 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs font-mono break-all flex-1 select-all">{value}</span>
      <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
        <Copy size={13} />
      </button>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold mt-4 mb-2">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function PrivacyBadge({ score }: { score: number }) {
  if (score >= 50) return <Badge variant="destructive">Alto risco de privacidade ({score}/100)</Badge>;
  if (score >= 20) return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Risco médio ({score}/100)</Badge>;
  return <Badge className="bg-green-600 text-white hover:bg-green-600">Baixo risco ({score}/100)</Badge>;
}

function FlagItem({ flag }: { flag: ForensicFlag }) {
  const icons = { danger: <ShieldAlert size={15} className="text-destructive shrink-0" />, warning: <AlertTriangle size={15} className="text-yellow-500 shrink-0" />, info: <Info size={15} className="text-blue-400 shrink-0" /> };
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg p-2.5 border", flag.active ? "opacity-100" : "opacity-30")}>
      {flag.active ? icons[flag.severity] : <CheckCircle size={15} className="text-muted-foreground shrink-0" />}
      <div>
        <p className="text-sm font-medium leading-none mb-0.5">{flag.label}</p>
        <p className="text-xs text-muted-foreground">{flag.description}</p>
      </div>
    </div>
  );
}

// ─── Histogram chart ──────────────────────────────────────────────────────────

function HistogramChart({ histogram }: { histogram: { r: number[]; g: number[]; b: number[] } }) {
  // Sample every 4 bins for readability (64 bars)
  const data = Array.from({ length: 64 }, (_, i) => {
    const bin = i * 4;
    const r = histogram.r.slice(bin, bin + 4).reduce((a, b) => a + b, 0);
    const g = histogram.g.slice(bin, bin + 4).reduce((a, b) => a + b, 0);
    const b = histogram.b.slice(bin, bin + 4).reduce((a, b) => a + b, 0);
    return { bin, r, g, b };
  });

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={3} barCategoryGap={0}>
        <XAxis dataKey="bin" tick={false} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(v) => `Valor ${v}–${Number(v) + 3}`} />
        <Bar dataKey="r" fill="#ef4444" opacity={0.8} />
        <Bar dataKey="g" fill="#22c55e" opacity={0.8} />
        <Bar dataKey="b" fill="#3b82f6" opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Tabs content ─────────────────────────────────────────────────────────────

function TabGeral({ result }: { result: ForensicResult }) {
  const { basic, imageAnalysis } = result;
  if (!basic) return null;

  const entropyColor = basic.entropy > 7.2 ? "text-destructive" : basic.entropy > 5 ? "text-yellow-500" : "text-green-500";

  return (
    <div className="space-y-1">
      <SectionTitle icon={<FileText size={14} />}>Informações do Arquivo</SectionTitle>
      <Row label="Nome" value={basic.name} />
      <Row label="Tamanho" value={`${formatBytes(basic.size)} (${basic.size.toLocaleString()} bytes)`} />
      <Row label="Tipo MIME" value={basic.type} />
      <Row label="Extensão" value={basic.extension || "—"} />
      <Row label="Modificado em" value={basic.lastModified.toLocaleString("pt-BR")} />

      <SectionTitle icon={<Hash size={14} />}>Hashes Criptográficos</SectionTitle>
      <HashRow label="MD5" value={basic.md5} />
      <HashRow label="SHA-1" value={basic.sha1} />
      <HashRow label="SHA-256" value={basic.sha256} />

      <SectionTitle icon={<BarChart2 size={14} />}>Análise</SectionTitle>
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-border/50">
        <span className="text-muted-foreground text-xs font-medium w-40 shrink-0 pt-0.5">Entropia de Shannon</span>
        <span className={cn("text-sm font-mono", entropyColor)}>{basic.entropy.toFixed(3)} bits/byte</span>
      </div>

      <SectionTitle icon={<Fingerprint size={14} />}>Assinatura de Arquivo</SectionTitle>
      <Row label="Magic bytes" value={basic.signature.magicBytes} />
      <Row label="Tipo detectado" value={basic.signature.detectedType} />
      <Row label="Tipo declarado" value={basic.signature.declaredType} />
      <div className="flex items-center gap-1 py-2">
        <span className="text-muted-foreground text-xs font-medium w-40 shrink-0">Correspondência</span>
        {basic.signature.match
          ? <Badge className="bg-green-600 text-white hover:bg-green-600 text-xs">Válida</Badge>
          : <Badge variant="destructive" className="text-xs">Incompatível</Badge>}
      </div>

      {imageAnalysis && (
        <>
          <SectionTitle icon={<Eye size={14} />}>Análise de Imagem</SectionTitle>
          <Row label="Dimensões" value={`${imageAnalysis.width} × ${imageAnalysis.height} px`} />
          <Row label="Canal R (médio)" value={`${imageAnalysis.rgbDistribution.r}%`} />
          <Row label="Canal G (médio)" value={`${imageAnalysis.rgbDistribution.g}%`} />
          <Row label="Canal B (médio)" value={`${imageAnalysis.rgbDistribution.b}%`} />
          <div className="py-2">
            <span className="text-muted-foreground text-xs font-medium block mb-1.5">Cores dominantes</span>
            <div className="flex gap-1.5 flex-wrap">
              {imageAnalysis.dominantColors.map((c) => (
                <div key={c} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded border border-border" style={{ background: c }} />
                  <span className="text-xs font-mono">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="py-2">
            <span className="text-muted-foreground text-xs font-medium block mb-1.5">Histograma RGB</span>
            <HistogramChart histogram={imageAnalysis.histogram} />
          </div>
        </>
      )}
    </div>
  );
}

function TabMetadata({ result }: { result: ForensicResult }) {
  const { exif, pdfMeta, officeMeta, mediaMeta, zipEntries, file } = result;

  return (
    <div className="space-y-1">
      {/* Image preview + EXIF */}
      {exif && file && (
        <>
          {/* Preview */}
          {isImage(file) && (
            <div className="mb-4 flex gap-4 flex-wrap">
              <div className="relative w-fit">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="max-h-48 max-w-full rounded-lg border object-contain"
                  style={{ transform: orientationTransform(exif.orientation) }}
                />
                <Badge className="absolute top-1 right-1 text-xs opacity-80">
                  {exif.width && exif.height ? `${exif.width}×${exif.height}` : ""}
                </Badge>
              </div>
              {exif.thumbnail && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Miniatura EXIF</p>
                  <img src={exif.thumbnail} alt="EXIF thumbnail" className="max-h-24 rounded border" />
                </div>
              )}
            </div>
          )}
          <SectionTitle icon={<Image size={14} />}>EXIF</SectionTitle>
          <Row label="Câmera (marca)" value={exif.make} />
          <Row label="Câmera (modelo)" value={exif.model} />
          <Row label="Nº de série" value={exif.serialNumber} />
          <Row label="ISO" value={exif.iso} />
          <Row label="Abertura" value={exif.aperture !== undefined ? `f/${exif.aperture}` : undefined} />
          <Row label="Vel. obturador" value={exif.shutterSpeed} />
          <Row label="Distância focal" value={exif.focalLength !== undefined ? `${exif.focalLength}mm` : undefined} />
          <Row label="Flash" value={exif.flash} />
          <Row label="Data original" value={exif.dateTimeOriginal} />
          <Row label="Data digitalização" value={exif.dateTimeDigitized} />
          <Row label="Data de modificação" value={exif.dateTime} />
          <Row label="Orientação" value={orientationLabel(exif.orientation)} />
          <Row label="Resolução" value={exif.xResolution && exif.yResolution ? `${exif.xResolution} × ${exif.yResolution} DPI` : undefined} />
          <Row label="Espaço de cor" value={exif.colorSpace} />
          <Row label="Software" value={exif.software} />

          {exif.xmp && (
            <>
              <SectionTitle>XMP</SectionTitle>
              {Object.entries(exif.xmp).slice(0, 20).map(([k, v]) => (
                <Row key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
              ))}
            </>
          )}
          {exif.iptc && (
            <>
              <SectionTitle>IPTC</SectionTitle>
              {Object.entries(exif.iptc).slice(0, 20).map(([k, v]) => (
                <Row key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
              ))}
            </>
          )}
        </>
      )}

      {/* PDF */}
      {pdfMeta && (
        <>
          <SectionTitle icon={<FileText size={14} />}>Metadados PDF</SectionTitle>
          <Row label="Título" value={pdfMeta.title} />
          <Row label="Autor" value={pdfMeta.author} />
          <Row label="Criador" value={pdfMeta.creator} />
          <Row label="Produtor" value={pdfMeta.producer} />
          <Row label="Assunto" value={pdfMeta.subject} />
          <Row label="Palavras-chave" value={pdfMeta.keywords} />
          <Row label="Data de criação" value={pdfMeta.creationDate} />
          <Row label="Última modificação" value={pdfMeta.modDate} />
          <Row label="Nº de páginas" value={pdfMeta.pageCount} />
          <Row label="Versão PDF" value={pdfMeta.version} />
          <div className="flex items-center gap-1 py-2 border-b border-border/50">
            <span className="text-muted-foreground text-xs font-medium w-40 shrink-0">Criptografado</span>
            {pdfMeta.encrypted
              ? <Badge variant="destructive" className="text-xs">Sim</Badge>
              : <Badge className="bg-green-600 text-white hover:bg-green-600 text-xs">Não</Badge>}
          </div>
        </>
      )}

      {/* Office */}
      {officeMeta && (
        <>
          <SectionTitle icon={<FileText size={14} />}>Metadados do Documento</SectionTitle>
          <Row label="Título" value={officeMeta.title} />
          <Row label="Criador" value={officeMeta.creator} />
          <Row label="Último editor" value={officeMeta.lastModifiedBy} />
          <Row label="Revisão" value={officeMeta.revision} />
          <Row label="Criado em" value={officeMeta.created} />
          <Row label="Modificado em" value={officeMeta.modified} />
          <Row label="Descrição" value={officeMeta.description} />
          <Row label="Palavras-chave" value={officeMeta.keywords} />
        </>
      )}

      {/* Audio/Video */}
      {mediaMeta && (
        <>
          <SectionTitle icon={<Music size={14} />}>Áudio / Vídeo</SectionTitle>
          <Row label="Duração" value={fmtDuration(mediaMeta.duration ?? 0)} />
          {mediaMeta.width && mediaMeta.height && (
            <Row label="Resolução" value={`${mediaMeta.width} × ${mediaMeta.height}`} />
          )}
          {mediaMeta.id3 && (
            <>
              <SectionTitle>Tags ID3</SectionTitle>
              {mediaMeta.id3.coverUrl && (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground mb-1">Capa do álbum</p>
                  <img src={mediaMeta.id3.coverUrl} alt="Cover" className="max-h-24 rounded border" />
                </div>
              )}
              <Row label="Título" value={mediaMeta.id3.title} />
              <Row label="Artista" value={mediaMeta.id3.artist} />
              <Row label="Álbum" value={mediaMeta.id3.album} />
              <Row label="Ano" value={mediaMeta.id3.year} />
            </>
          )}
          {mediaMeta.vorbis && Object.keys(mediaMeta.vorbis).length > 0 && (
            <>
              <SectionTitle>Vorbis Comments</SectionTitle>
              {Object.entries(mediaMeta.vorbis).map(([k, v]) => (
                <Row key={k} label={k} value={v} />
              ))}
            </>
          )}
        </>
      )}

      {/* ZIP entries */}
      {zipEntries && zipEntries.length > 0 && (
        <>
          <SectionTitle icon={<Archive size={14} />}>Conteúdo do ZIP ({zipEntries.length} {zipEntries.length === 1 ? "arquivo" : "arquivos"})</SectionTitle>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs text-right">Tamanho</TableHead>
                  <TableHead className="text-xs text-right">Comprimido</TableHead>
                  <TableHead className="text-xs">Método</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zipEntries.slice(0, 200).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono max-w-48 truncate">{e.name}</TableCell>
                    <TableCell className="text-xs text-right">{formatBytes(e.size)}</TableCell>
                    <TableCell className="text-xs text-right">{formatBytes(e.compressedSize)}</TableCell>
                    <TableCell className="text-xs">{e.method === 0 ? "Stored" : e.method === 8 ? "Deflate" : String(e.method)}</TableCell>
                    <TableCell className="text-xs">{e.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!exif && !pdfMeta && !officeMeta && !mediaMeta && (!zipEntries || zipEntries.length === 0) && (
        <p className="text-muted-foreground text-sm py-4 text-center">Nenhum metadado específico extraído para este tipo de arquivo.</p>
      )}
    </div>
  );
}

function TabStrings({ strings }: { strings: string[] }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;
  const pages = Math.ceil(strings.length / PER_PAGE);
  const visible = strings.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const copyAll = () => {
    navigator.clipboard.writeText(strings.join("\n"));
    toast.success("Strings copiadas!");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{strings.length} string{strings.length !== 1 ? "s" : ""} extraída{strings.length !== 1 ? "s" : ""} (min. 4 chars)</p>
        <Button size="sm" variant="outline" onClick={copyAll}><Copy size={13} className="mr-1.5" />Copiar tudo</Button>
      </div>
      <ScrollArea className="h-72 rounded-md border">
        <div className="p-2 space-y-px">
          {visible.map((s, i) => (
            <p key={i} className="text-xs font-mono py-0.5 px-1 rounded hover:bg-muted truncate" title={s}>{s}</p>
          ))}
        </div>
      </ScrollArea>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
          <span>Página {page + 1}/{pages}</span>
          <Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Próxima →</Button>
        </div>
      )}
    </div>
  );
}

function TabLocation({ result }: { result: ForensicResult }) {
  const gps = result.exif?.gps;
  if (!gps) return <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma informação de localização GPS encontrada.</p>;

  const lat = gps.latitude.toFixed(6);
  const lon = gps.longitude.toFixed(6);
  const gmaps = `https://maps.google.com/?q=${lat},${lon}`;
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;

  return (
    <div className="space-y-1">
      <SectionTitle icon={<MapPin size={14} />}>Coordenadas GPS</SectionTitle>
      <Row label="Latitude" value={`${lat}°`} />
      <Row label="Longitude" value={`${lon}°`} />
      {gps.altitude !== undefined && <Row label="Altitude" value={`${gps.altitude.toFixed(1)}m`} />}
      <div className="flex gap-2 mt-4 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => window.open(gmaps, "_blank")}>
          <ExternalLink size={13} className="mr-1.5" />Google Maps
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.open(osm, "_blank")}>
          <ExternalLink size={13} className="mr-1.5" />OpenStreetMap
        </Button>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${lat},${lon}`); toast.success("Coordenadas copiadas!"); }}>
          <Copy size={13} className="mr-1.5" />Copiar coordenadas
        </Button>
      </div>
    </div>
  );
}

function TabForensic({ result }: { result: ForensicResult }) {
  const { privacyScore = 0, flags = [], imageAnalysis } = result;
  const activeFlags = flags.filter(f => f.active);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Score de Privacidade</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", privacyScore >= 50 ? "bg-destructive" : privacyScore >= 20 ? "bg-yellow-500" : "bg-green-500")} style={{ width: `${privacyScore}%` }} />
          </div>
          <PrivacyBadge score={privacyScore} />
        </div>
      </div>

      {imageAnalysis && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Esteganografia:</span>
          <Badge variant={imageAnalysis.steganography === "suspicious" ? "destructive" : "outline"} className="text-xs capitalize">
            {imageAnalysis.steganography === "unlikely" ? "Improvável" : imageAnalysis.steganography === "inconclusive" ? "Inconclusivo" : "Suspeito"}
          </Badge>
        </div>
      )}

      <Separator />

      <div>
        <p className="text-sm font-medium mb-2">
          Indicadores ativos: <span className="text-destructive">{activeFlags.length}</span> / {flags.length}
        </p>
        <div className="space-y-2">
          {flags.map(flag => <FlagItem key={flag.id} flag={flag} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ForenseClient() {
  const [result, setResult] = useState<ForensicResult>({ status: "idle" });


  const handleUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Revoke previous cover URL if any
    if (result.mediaMeta?.id3?.coverUrl) URL.revokeObjectURL(result.mediaMeta.id3.coverUrl);

    setResult({ status: "processing", file });

    try {
      await processFile(file, (partial) => {
        setResult(prev => ({ ...prev, ...partial, file }));
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha no processamento: ${msg}`);
      setResult({ status: "error", file, error: msg });
    }
  }, [result.mediaMeta?.id3?.coverUrl]);

  const reset = useCallback(() => {
    if (result.mediaMeta?.id3?.coverUrl) URL.revokeObjectURL(result.mediaMeta.id3.coverUrl);
    setResult({ status: "idle" });
  }, [result.mediaMeta?.id3?.coverUrl]);

  const exportJson = useCallback(() => {
    if (!result.basic) return;
    const exportable = {
      basic: result.basic,
      exif: result.exif,
      pdfMeta: result.pdfMeta,
      officeMeta: result.officeMeta,
      mediaMeta: result.mediaMeta ? { ...result.mediaMeta, id3: result.mediaMeta.id3 ? { ...result.mediaMeta.id3, coverUrl: undefined } : undefined } : undefined,
      zipEntries: result.zipEntries,
      privacyScore: result.privacyScore,
      flags: result.flags,
    };
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `forense_${result.basic.name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("JSON exportado!");
  }, [result]);

  const copyJson = useCallback(() => {
    if (!result.basic) return;
    const exportable = {
      basic: result.basic,
      exif: result.exif,
      pdfMeta: result.pdfMeta,
      officeMeta: result.officeMeta,
      mediaMeta: result.mediaMeta ? { ...result.mediaMeta, id3: result.mediaMeta.id3 ? { ...result.mediaMeta.id3, coverUrl: undefined } : undefined } : undefined,
      zipEntries: result.zipEntries,
      privacyScore: result.privacyScore,
      flags: result.flags,
    };
    navigator.clipboard.writeText(JSON.stringify(exportable, null, 2));
    toast.success("JSON copiado!");
  }, [result]);

  const hasGps = !!result.exif?.gps;

  if (result.status === "idle" || result.status === "error") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <ScanSearch size={28} className="text-foreground" />
          <div>
            <h1 className="text-xl font-bold">Analisador Forense</h1>
            <p className="text-sm text-muted-foreground">Metadados, hashes, EXIF, GPS e mais — 100% no navegador</p>
          </div>
        </div>
        {result.status === "error" && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{result.error}</div>
        )}
        <FileDropzone onUpload={handleUpload} accept="*/*" label="Arraste, clique ou cole qualquer arquivo para analisar" />
      </div>
    );
  }

  if (result.status === "processing" && !result.basic) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full border-4 border-border border-t-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">Processando arquivo…</p>
      </div>
    );
  }

  const file = result.file!;
  const isProcessing = result.status === "processing";

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ScanSearch size={20} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.type || "tipo desconhecido"}</p>
          </div>
          {isProcessing && <div className="animate-spin rounded-full border-2 border-border border-t-foreground h-4 w-4 shrink-0 ml-1" />}
          {!isProcessing && result.privacyScore !== undefined && <PrivacyBadge score={result.privacyScore} />}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportJson} disabled={!result.basic}><Download size={13} className="mr-1.5" />JSON</Button>
          <Button size="sm" variant="outline" onClick={copyJson} disabled={!result.basic}><Copy size={13} className="mr-1.5" />Copiar</Button>
          <Button size="sm" variant="ghost" onClick={reset}><RefreshCw size={13} className="mr-1.5" />Novo</Button>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="geral">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
          <TabsTrigger value="metadados" className="text-xs">Metadados</TabsTrigger>
          <TabsTrigger value="strings" className="text-xs">Strings</TabsTrigger>
          {hasGps && <TabsTrigger value="localizacao" className="text-xs">Localização</TabsTrigger>}
          <TabsTrigger value="forense" className="text-xs">Forense</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <TabGeral result={result} />
        </TabsContent>

        <TabsContent value="metadados" className="mt-4">
          <TabMetadata result={result} />
        </TabsContent>

        <TabsContent value="strings" className="mt-4">
          {result.strings
            ? <TabStrings strings={result.strings} />
            : <p className="text-muted-foreground text-sm py-4 text-center">Extraindo strings…</p>}
        </TabsContent>

        {hasGps && (
          <TabsContent value="localizacao" className="mt-4">
            <TabLocation result={result} />
          </TabsContent>
        )}

        <TabsContent value="forense" className="mt-4">
          <TabForensic result={result} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
