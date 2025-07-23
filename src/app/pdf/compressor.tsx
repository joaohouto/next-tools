"use client";

import FileDropzone from "@/components/file-dropzone";
import { Spinner } from "@/components/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, File, Package } from "lucide-react";
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import PdfPreview from "./pdf-preview";

export default function PdfCompressor() {
  const [originalPdf, setOriginalPdf] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedPdf, setCompressedPdf] = useState<{
    url: string;
    size: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleCompress = async () => {
    if (!originalPdf) return;

    setLoading(true);
    setCompressedPdf(null);

    try {
      const existingPdfBytes = await originalPdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const newPdfDoc = await PDFDocument.create();

      const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page) => newPdfDoc.addPage(page));

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setCompressedPdf({ url, size: blob.size });
    } catch (error) {
      console.error("Erro ao comprimir o PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col content-center gap-4">
      <FileDropzone
        accept=".pdf"
        label="Arraste, clique ou cole (Ctrl+V) um PDF"
        onUpload={(files) => {
          if (files.length > 0) {
            const file = files[0];
            setOriginalPdf(file);
            setCompressedPdf(null);
            setPreviewUrl(null); // Reseta o preview anterior
          }
        }}
      />

      <div className="flex gap-2">
        <Button onClick={handleCompress} disabled={!originalPdf || loading}>
          <Package />
          Comprimir
        </Button>
      </div>

      {originalPdf && (
        <Alert className="flex flex-col h-auto items-start">
          <div className="flex justify-between items-center w-full mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <File className="flex-shrink-0" />
              <div className="truncate">
                <AlertTitle className="truncate">{originalPdf.name}</AlertTitle>
                <AlertDescription>
                  {formatBytes(originalPdf.size)}
                </AlertDescription>
              </div>
            </div>
          </div>
          <div className="w-full p-2 bg-muted/50 rounded-md flex justify-center items-center min-h-[144px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview of ${originalPdf.name}`}
                className="max-h-32 rounded-md"
              />
            ) : (
              <PdfPreview
                file={originalPdf}
                width={128}
                onPreviewReady={(dataUrl) => setPreviewUrl(dataUrl)}
              />
            )}
          </div>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span className="text-sm text-muted-foreground">Comprimindo...</span>
        </div>
      )}

      {compressedPdf && originalPdf && (
        <Alert className="flex justify-between items-center bg-green-100 dark:bg-green-900/30">
          <div className="flex items-center gap-2">
            <File />
            <div>
              <AlertTitle>compressed-{originalPdf.name}</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{formatBytes(compressedPdf.size)}</span>
                <Badge variant="outline" className="rounded-full">
                  {`-${(
                    (1 - compressedPdf.size / originalPdf.size) *
                    100
                  ).toFixed(0)}%`}
                </Badge>
              </AlertDescription>
            </div>
          </div>
          <a
            href={compressedPdf.url}
            download={`compressed-${originalPdf?.name}`}
          >
            <Button size="icon">
              <Download />
            </Button>
          </a>
        </Alert>
      )}
    </div>
  );
}
