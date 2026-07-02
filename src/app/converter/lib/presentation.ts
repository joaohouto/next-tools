import { readZipEntries, readZipEntryBytes } from "@/lib/zip-reader";
import { textToDocxBlob, textToPdfBlob } from "./document";
import type { ConverterModule, TargetFormat } from "./types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TARGETS: TargetFormat[] = [
  { id: "txt", label: "TXT (texto)", ext: "txt", mime: "text/plain", limited: true },
  { id: "docx", label: "DOCX (texto)", ext: "docx", mime: DOCX_MIME, limited: true },
  { id: "pdf", label: "PDF (texto)", ext: "pdf", mime: "application/pdf", limited: true },
];

function isPptxFile(file: File) {
  return /\.pptx$/i.test(file.name) ||
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

function extractSlideText(xml: string): string {
  return [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ").trim();
}

/** Extracts only the text content of each slide — layout, images and styling are not preserved. */
async function pptxToText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const slideEntries = readZipEntries(buf)
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort((a, b) => Number(a.name.match(/slide(\d+)\.xml/)![1]) - Number(b.name.match(/slide(\d+)\.xml/)![1]));

  const slides: string[] = [];
  for (const entry of slideEntries) {
    const bytes = await readZipEntryBytes(buf, entry);
    if (!bytes) continue;
    slides.push(extractSlideText(new TextDecoder().decode(bytes)));
  }
  return slides.map((text, i) => `Slide ${i + 1}\n${text || "(sem texto)"}`).join("\n\n");
}

export const presentationModule: ConverterModule = {
  id: "presentation",
  label: "Apresentações",
  accept: [".pptx"],
  detect: isPptxFile,

  getTargets: () => TARGETS,

  async convert(inputs, target, onProgress) {
    const results = [];
    for (const { id, file } of inputs) {
      onProgress(id, "processing");
      try {
        const text = await pptxToText(file);
        const baseName = file.name.replace(/\.[^.]+$/, "");
        let blob: Blob;
        if (target.id === "txt") blob = new Blob([text], { type: "text/plain" });
        else if (target.id === "docx") blob = await textToDocxBlob(text);
        else blob = await textToPdfBlob(text);
        results.push({ name: `${baseName}.${target.ext}`, blob, sourceFileId: id });
        onProgress(id, "done");
      } catch {
        onProgress(id, "error");
      }
    }
    return results;
  },
};
