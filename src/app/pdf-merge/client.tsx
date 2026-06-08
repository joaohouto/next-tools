"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument, PDFImage } from "pdf-lib";
import { Download, Trash2, ArrowUp, ArrowDown, FileStack, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/file-dropzone";
import { toast } from "sonner";
import { CardAnimatedBorder } from "@/components/card-animated-border";

interface MergeItem {
  id: string;
  file: File;
  type: "pdf" | "image";
  pageCount?: number;
  previewUrl?: string;
}

const ACCEPTED =
  "application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff";

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.name);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function imageFileToPng(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new globalThis.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("conversion failed")); return; }
        blob.arrayBuffer().then(resolve).catch(reject);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
    img.src = url;
  });
}

async function addImageToDoc(doc: PDFDocument, file: File) {
  let embedded: PDFImage;
  const mime = file.type;

  if (mime === "image/jpeg" || mime === "image/jpg") {
    embedded = await doc.embedJpg(await file.arrayBuffer());
  } else {
    const pngBytes = await imageFileToPng(file);
    embedded = await doc.embedPng(pngBytes);
  }

  const page = doc.addPage([embedded.width, embedded.height]);
  page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
}

export default function PdfMerge() {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [merging, setMerging] = useState(false);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => isPdf(f) || isImage(f));
    if (valid.length === 0) {
      toast.error("Adicione arquivos PDF ou imagens (JPG, PNG, WebP…)");
      return;
    }

    const newItems: MergeItem[] = await Promise.all(
      valid.map(async (file) => {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;

        if (isPdf(file)) {
          try {
            const doc = await PDFDocument.load(await file.arrayBuffer());
            return { id, file, type: "pdf" as const, pageCount: doc.getPageCount() };
          } catch {
            return { id, file, type: "pdf" as const };
          }
        } else {
          const previewUrl = URL.createObjectURL(file);
          previewUrls.current.push(previewUrl);
          return { id, file, type: "image" as const, pageCount: 1, previewUrl };
        }
      }),
    );

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const remove = (id: string) => {
    setItems((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
        previewUrls.current = previewUrls.current.filter((u) => u !== removed.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setItems((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const merge = async () => {
    if (items.length < 2) {
      toast.error("Adicione pelo menos 2 arquivos para mesclar.");
      return;
    }

    setMerging(true);
    try {
      const doc = await PDFDocument.create();

      for (const item of items) {
        if (item.type === "pdf") {
          const src = await PDFDocument.load(await item.file.arrayBuffer());
          const copied = await doc.copyPages(src, src.getPageIndices());
          copied.forEach((page) => doc.addPage(page));
        } else {
          await addImageToDoc(doc, item.file);
        }
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Arquivos mesclados com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao mesclar. Verifique os arquivos.");
    } finally {
      setMerging(false);
    }
  };

  const totalPages = items.reduce((sum, i) => sum + (i.pageCount ?? 0), 0);

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col gap-4">
        <FileDropzone
          onUpload={addFiles}
          accept={ACCEPTED}
          label="Arraste ou clique para adicionar PDFs e imagens"
          multiple
        />

        {items.length === 0 ? (
          <CardAnimatedBorder className="!w-full text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center gap-2">
            <FileStack size={32} />
            <span className="text-sm">Nenhum arquivo adicionado</span>
          </CardAnimatedBorder>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {items.length} arquivo{items.length !== 1 ? "s" : ""} · {totalPages} página{totalPages !== 1 ? "s" : ""} no total
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveDown(index)}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown size={12} />
                    </Button>
                  </div>

                  <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                    {index + 1}
                  </span>

                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-10 w-10 object-cover rounded border shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 flex items-center justify-center rounded border bg-muted shrink-0">
                      {item.type === "pdf" ? (
                        <FileText size={18} className="text-muted-foreground" />
                      ) : (
                        <Image size={18} className="text-muted-foreground" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.pageCount !== undefined &&
                        ` · ${item.pageCount} página${item.pageCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={merge} disabled={merging || items.length < 2} className="w-full">
              <Download size={16} />
              {merging ? "Mesclando..." : `Mesclar ${items.length} arquivo${items.length !== 1 ? "s" : ""}`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
