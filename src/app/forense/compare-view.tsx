"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatBytes, cn } from "@/lib/utils";
import type { ForensicResult } from "./forensic-types";

// ─── field extraction ─────────────────────────────────────────────────────────

interface FieldGroup {
  label: string;
  fields: Array<{ key: string; a: string | undefined; b: string | undefined }>;
}

function val(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return String(v);
}

function extractGroups(a: ForensicResult, b: ForensicResult): FieldGroup[] {
  const groups: FieldGroup[] = [];

  // ── Identificação ──
  const id: FieldGroup = { label: "Identificação", fields: [] };
  const add = (key: string, va: unknown, vb: unknown) =>
    id.fields.push({ key, a: val(va), b: val(vb) });

  add("Nome", a.basic?.name, b.basic?.name);
  add("Tamanho", a.basic ? formatBytes(a.basic.size) : undefined, b.basic ? formatBytes(b.basic.size) : undefined);
  add("Tipo MIME", a.basic?.type, b.basic?.type);
  add("Extensão", a.basic?.extension, b.basic?.extension);
  add("Modificado em", a.basic?.lastModified.toLocaleString("pt-BR"), b.basic?.lastModified.toLocaleString("pt-BR"));
  groups.push(id);

  // ── Hashes ──
  const hashes: FieldGroup = { label: "Hashes", fields: [] };
  const addH = (key: string, va: unknown, vb: unknown) =>
    hashes.fields.push({ key, a: val(va), b: val(vb) });

  addH("MD5", a.basic?.md5, b.basic?.md5);
  addH("SHA-1", a.basic?.sha1, b.basic?.sha1);
  addH("SHA-256", a.basic?.sha256, b.basic?.sha256);
  addH("Entropia", a.basic?.entropy.toFixed(3), b.basic?.entropy.toFixed(3));
  groups.push(hashes);

  // ── Integridade ──
  const integrity: FieldGroup = { label: "Integridade", fields: [] };
  integrity.fields.push({
    key: "Assinatura",
    a: a.basic?.signature.detectedType,
    b: b.basic?.signature.detectedType,
  });
  integrity.fields.push({
    key: "Status",
    a: a.corruption?.status,
    b: b.corruption?.status,
  });
  groups.push(integrity);

  // ── EXIF ──
  if (a.exif || b.exif) {
    const exif: FieldGroup = { label: "EXIF", fields: [] };
    const addE = (key: string, va: unknown, vb: unknown) =>
      exif.fields.push({ key, a: val(va), b: val(vb) });

    addE("Câmera", a.exif?.make, b.exif?.make);
    addE("Modelo", a.exif?.model, b.exif?.model);
    addE("Nº de série", a.exif?.serialNumber, b.exif?.serialNumber);
    addE("ISO", a.exif?.iso, b.exif?.iso);
    addE("Abertura", a.exif?.aperture !== undefined ? `f/${a.exif.aperture}` : undefined, b.exif?.aperture !== undefined ? `f/${b.exif.aperture}` : undefined);
    addE("Vel. obturador", a.exif?.shutterSpeed, b.exif?.shutterSpeed);
    addE("Distância focal", a.exif?.focalLength !== undefined ? `${a.exif.focalLength}mm` : undefined, b.exif?.focalLength !== undefined ? `${b.exif.focalLength}mm` : undefined);
    addE("Data original", a.exif?.dateTimeOriginal, b.exif?.dateTimeOriginal);
    addE("Software", a.exif?.software, b.exif?.software);
    addE("Orientação", val(a.exif?.orientation), val(b.exif?.orientation));
    addE(
      "GPS",
      a.exif?.gps ? `${a.exif.gps.latitude.toFixed(5)}, ${a.exif.gps.longitude.toFixed(5)}` : undefined,
      b.exif?.gps ? `${b.exif.gps.latitude.toFixed(5)}, ${b.exif.gps.longitude.toFixed(5)}` : undefined,
    );
    groups.push(exif);
  }

  // ── PDF ──
  if (a.pdfMeta || b.pdfMeta) {
    const pdf: FieldGroup = { label: "PDF", fields: [] };
    const addP = (key: string, va: unknown, vb: unknown) =>
      pdf.fields.push({ key, a: val(va), b: val(vb) });

    addP("Título", a.pdfMeta?.title, b.pdfMeta?.title);
    addP("Autor", a.pdfMeta?.author, b.pdfMeta?.author);
    addP("Criador", a.pdfMeta?.creator, b.pdfMeta?.creator);
    addP("Produtor", a.pdfMeta?.producer, b.pdfMeta?.producer);
    addP("Data de criação", a.pdfMeta?.creationDate, b.pdfMeta?.creationDate);
    addP("Última modificação", a.pdfMeta?.modDate, b.pdfMeta?.modDate);
    addP("Páginas", a.pdfMeta?.pageCount, b.pdfMeta?.pageCount);
    addP("Versão PDF", a.pdfMeta?.version, b.pdfMeta?.version);
    addP("Criptografado", val(a.pdfMeta?.encrypted), val(b.pdfMeta?.encrypted));
    groups.push(pdf);
  }

  // ── Office ──
  if (a.officeMeta || b.officeMeta) {
    const office: FieldGroup = { label: "Documento Office", fields: [] };
    const addO = (key: string, va: unknown, vb: unknown) =>
      office.fields.push({ key, a: val(va), b: val(vb) });

    addO("Título", a.officeMeta?.title, b.officeMeta?.title);
    addO("Criador", a.officeMeta?.creator, b.officeMeta?.creator);
    addO("Último editor", a.officeMeta?.lastModifiedBy, b.officeMeta?.lastModifiedBy);
    addO("Revisão", a.officeMeta?.revision, b.officeMeta?.revision);
    addO("Criado em", a.officeMeta?.created, b.officeMeta?.created);
    addO("Modificado em", a.officeMeta?.modified, b.officeMeta?.modified);
    groups.push(office);
  }

  // Remove groups where every field has both values undefined
  return groups
    .map(g => ({ ...g, fields: g.fields.filter(f => f.a !== undefined || f.b !== undefined) }))
    .filter(g => g.fields.length > 0);
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function CellValue({ value, differ }: { value?: string; differ: boolean }) {
  if (!value) return <span className="text-muted-foreground/50 text-xs italic">—</span>;
  return (
    <span
      className={cn(
        "text-xs break-all font-mono",
        differ ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

function MatchBadge({ differ }: { differ: boolean }) {
  if (!differ) return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-600/10 text-green-600 border-green-600/30">igual</Badge>;
  return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">dif.</Badge>;
}

export function CompareView({ a, b }: { a: ForensicResult; b: ForensicResult }) {
  const groups = extractGroups(a, b);

  const totalFields = groups.reduce((s, g) => s + g.fields.length, 0);
  const diffFields = groups.reduce(
    (s, g) => s + g.fields.filter(f => f.a !== f.b).length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm">
          <span className="font-medium">{diffFields}</span>
          <span className="text-muted-foreground"> campo{diffFields !== 1 ? "s" : ""} diferentes</span>
          <span className="text-muted-foreground"> de {totalFields}</span>
        </div>
        {diffFields === 0
          ? <Badge className="bg-green-600 text-white hover:bg-green-600">Arquivos idênticos nos metadados</Badge>
          : <Badge variant="destructive">Diferenças detectadas</Badge>
        }
      </div>

      <Separator />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-3 px-1 text-xs font-semibold text-muted-foreground">
        <span>Campo</span>
        <span className="truncate" title={a.basic?.name}>{a.basic?.name ?? "Arquivo A"}</span>
        <span className="truncate" title={b.basic?.name}>{b.basic?.name ?? "Arquivo B"}</span>
        <span />
      </div>

      {groups.map(group => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-3">{group.label}</p>
          <div className="rounded-md border overflow-hidden">
            {group.fields.map((field, idx) => {
              const differ = field.a !== field.b;
              return (
                <div
                  key={field.key}
                  className={cn(
                    "grid grid-cols-[1fr_1fr_1fr_auto] gap-x-3 px-3 py-2 text-xs items-start",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/30",
                    differ && "bg-destructive/5",
                  )}
                >
                  <span className="text-muted-foreground font-medium pt-0.5">{field.key}</span>
                  <CellValue value={field.a} differ={differ} />
                  <CellValue value={field.b} differ={differ} />
                  <MatchBadge differ={differ} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
