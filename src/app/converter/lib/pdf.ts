import { getPdfPageCount, renderPdfPage } from "@/lib/pdf-render";
import type { ConverterModule, TargetFormat } from "./types";

const TARGETS: TargetFormat[] = [
  { id: "image/png", label: "PNG (por página)", ext: "png", mime: "image/png" },
  { id: "image/jpeg", label: "JPG (por página)", ext: "jpg", mime: "image/jpeg" },
];

function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export const pdfModule: ConverterModule = {
  id: "pdf",
  label: "PDF",
  accept: ["application/pdf", ".pdf"],
  detect: isPdfFile,

  getTargets: () => TARGETS,

  async convert(inputs, target, onProgress) {
    const results = [];
    for (const { id, file } of inputs) {
      onProgress(id, "processing");
      try {
        const pageCount = await getPdfPageCount(file);
        const baseName = file.name.replace(/\.pdf$/i, "");
        for (let page = 1; page <= pageCount; page++) {
          const { dataUrl } = await renderPdfPage(file, page, 2, target.mime as "image/png" | "image/jpeg");
          const blob = await (await fetch(dataUrl)).blob();
          results.push({
            name: pageCount > 1 ? `${baseName}-p${page}.${target.ext}` : `${baseName}.${target.ext}`,
            blob,
            sourceFileId: id,
          });
        }
        onProgress(id, "done");
      } catch (err) {
        console.error(err);
        onProgress(id, "error");
      }
    }
    return results;
  },
};
