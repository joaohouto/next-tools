"use client";

import { useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import { Download, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import FileDropzone from "@/components/file-dropzone";
import { toast } from "sonner";
import { CardAnimatedBorder } from "@/components/card-animated-border";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PageImage {
  pageNumber: number;
  dataUrl: string;
}

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(2);

  const renderPdf = useCallback(async (pdf: File, dpi: number) => {
    setLoading(true);
    setPages([]);

    try {
      const bytes = await pdf.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const rendered: PageImage[] = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: dpi });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;
        rendered.push({ pageNumber: i, dataUrl: canvas.toDataURL("image/png") });
      }

      setPages(rendered);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar o PDF.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpload = useCallback(
    async (files: File[]) => {
      const pdf = files.find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
      if (!pdf) {
        toast.error("Selecione um arquivo PDF.");
        return;
      }
      setFile(pdf);
      await renderPdf(pdf, scale);
    },
    [renderPdf, scale],
  );

  const handleScaleChange = useCallback(
    async (value: number[]) => {
      setScale(value[0]);
      if (file) await renderPdf(file, value[0]);
    },
    [file, renderPdf],
  );

  const downloadAll = () => {
    pages.forEach(({ pageNumber, dataUrl }) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${file?.name.replace(/\.pdf$/i, "") ?? "page"}-p${pageNumber}.png`;
      a.click();
    });
  };

  const downloadOne = (page: PageImage) => {
    const a = document.createElement("a");
    a.href = page.dataUrl;
    a.download = `${file?.name.replace(/\.pdf$/i, "") ?? "page"}-p${page.pageNumber}.png`;
    a.click();
  };

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col gap-4">
        <FileDropzone
          onUpload={handleUpload}
          accept="application/pdf,.pdf"
          label="Arraste ou clique para adicionar um PDF"
          isLoading={loading}
        />

        <div className="flex flex-col gap-2">
          <Label>Qualidade · {scale}×</Label>
          <Slider
            min={1}
            max={4}
            step={0.5}
            value={[scale]}
            onValueChange={handleScaleChange}
          />
          <p className="text-xs text-muted-foreground">
            Escala de renderização (1× = 72 dpi, 2× = 144 dpi, 4× = 288 dpi)
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" />
            Convertendo páginas...
          </div>
        )}

        {!loading && pages.length === 0 && (
          <CardAnimatedBorder className="!w-full text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center gap-2">
            <FileImage size={32} />
            <span className="text-sm">Nenhum PDF carregado</span>
          </CardAnimatedBorder>
        )}

        {pages.length > 0 && (
          <>
            <Button onClick={downloadAll} variant="default" className="w-full">
              <Download size={16} />
              Baixar todas ({pages.length} imagem{pages.length !== 1 ? "ns" : ""})
            </Button>

            <div className="flex flex-col gap-4">
              {pages.map((page) => (
                <div key={page.pageNumber} className="border rounded-xl overflow-hidden">
                  <img
                    src={page.dataUrl}
                    alt={`Página ${page.pageNumber}`}
                    className="w-full h-auto"
                  />
                  <div className="flex items-center justify-between p-2 bg-muted/30">
                    <span className="text-xs text-muted-foreground">
                      Página {page.pageNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => downloadOne(page)}
                    >
                      <Download size={12} />
                      PNG
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
