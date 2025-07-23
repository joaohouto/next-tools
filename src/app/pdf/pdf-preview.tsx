"use client";

import { useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  file: File;
  width: number;
  onPreviewReady: (dataUrl: string) => void;
}

export default function PdfPreview({
  file,
  width,
  onPreviewReady,
}: PdfPreviewProps) {
  useEffect(() => {
    if (!file) return;

    const loadPdf = async () => {
      try {
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
          if (!e.target?.result) return;
          const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const page = await pdf.getPage(1);

          const viewport = page.getViewport({ scale: 1 });
          const scale = width / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) return;

          canvas.height = scaledViewport.height;
          canvas.width = scaledViewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: scaledViewport,
          };
          await page.render(renderContext).promise;

          onPreviewReady(canvas.toDataURL("image/png"));
        };
        fileReader.readAsArrayBuffer(file);
      } catch (error) {
        console.error("Erro ao renderizar o preview do PDF:", error);
      }
    };

    loadPdf();
  }, [file, width, onPreviewReady]);

  return null; // Este componente agora apenas processa, não renderiza nada diretamente.
}
