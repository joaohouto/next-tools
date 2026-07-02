import { PDFDocument } from "pdf-lib";
import { imageFileToBlob } from "@/lib/canvas-image";
import { addImagePageToPdf } from "@/lib/pdf-render";
import type { ConverterModule, TargetFormat } from "./types";

const IMAGE_TARGETS: TargetFormat[] = [
  { id: "image/webp", label: "WEBP", ext: "webp", mime: "image/webp" },
  { id: "image/png", label: "PNG", ext: "png", mime: "image/png" },
  { id: "image/jpeg", label: "JPG", ext: "jpg", mime: "image/jpeg" },
  { id: "image/bmp", label: "BMP", ext: "bmp", mime: "image/bmp" },
];

const PDF_TARGET: TargetFormat = { id: "application/pdf", label: "PDF (juntar tudo)", ext: "pdf", mime: "application/pdf" };

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

export const imagesModule: ConverterModule = {
  id: "image",
  label: "Imagens",
  accept: ["image/*"],
  detect: isImageFile,

  getTargets: (files) => (files.length > 1 ? [...IMAGE_TARGETS, PDF_TARGET] : IMAGE_TARGETS),

  async convert(inputs, target, onProgress) {
    if (target.id === PDF_TARGET.id) {
      const doc = await PDFDocument.create();
      for (const { id, file } of inputs) {
        onProgress(id, "processing");
        try {
          await addImagePageToPdf(doc, file);
          onProgress(id, "done");
        } catch {
          onProgress(id, "error");
        }
      }
      const bytes = await doc.save();
      return [{
        name: "imagens-convertidas.pdf",
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        sourceFileId: inputs[0]?.id ?? "merged",
      }];
    }

    const results = [];
    for (const { id, file } of inputs) {
      onProgress(id, "processing");
      try {
        const blob = await imageFileToBlob(file, target.mime);
        results.push({
          name: `${file.name.replace(/\.[^.]+$/, "")}.${target.ext}`,
          blob,
          sourceFileId: id,
        });
        onProgress(id, "done");
      } catch {
        onProgress(id, "error");
      }
    }
    return results;
  },
};
