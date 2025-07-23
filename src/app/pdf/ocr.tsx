"use client";

import { useState } from "react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import FileDropzone from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { File as FileIcon, ScanText, Copy, File } from "lucide-react";
import PdfPreview from "./pdf-preview";
import { formatBytes } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function PdfOcr() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  const handleExtractText = async () => {
    if (!file) return;

    setLoading(true);
    setExtractedText("");
    setProgress(0);
    setStatus("Iniciando o processo de OCR...");

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        if (!e.target?.result) return;
        const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const numPages = pdf.numPages;
        let fullText = "";

        const worker = await createWorker("por");

        worker.setParameters({
          logger: (m: any) => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
            }
            setStatus(m.status);
          },
        });

        for (let i = 1; i <= numPages; i++) {
          setStatus(`Processando página ${i} de ${numPages}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          const imageData = canvas.toDataURL("image/png");

          const {
            data: { text },
          } = await worker.recognize(imageData);
          fullText += text + "\n\n";
          setExtractedText(fullText);
        }

        await worker.terminate();
        setStatus("Concluído!");
        setLoading(false);
      };
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro ao extrair texto do PDF:", error);
      setStatus("Erro durante o processo.");
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
  };

  return (
    <div className="flex flex-col content-center gap-4">
      <FileDropzone
        accept=".pdf"
        label="Arraste, clique ou cole (Ctrl+V) um PDF"
        onUpload={(files) => {
          if (files.length > 0) {
            setFile(files[0]);
            setExtractedText("");
            setPreviewUrl(null);
          }
        }}
      />

      <div>
        <Button onClick={handleExtractText} disabled={!file || loading}>
          <ScanText />
          Extrair Texto
        </Button>
      </div>

      {file && (
        <Alert className="flex flex-col h-auto items-start">
          <div className="flex justify-between items-center w-full mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <File className="flex-shrink-0" />
              <div className="truncate">
                <AlertTitle className="truncate">{file.name}</AlertTitle>
                <AlertDescription>{formatBytes(file.size)}</AlertDescription>
              </div>
            </div>
          </div>
          <div className="w-full p-2 bg-muted/50 rounded-md flex justify-center items-center min-h-[144px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="max-h-32 rounded-md"
              />
            ) : (
              <PdfPreview
                file={file}
                width={128}
                onPreviewReady={(dataUrl) => setPreviewUrl(dataUrl)}
              />
            )}
          </div>
        </Alert>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-2">
          <Spinner />
          <span className="text-sm text-muted-foreground capitalize">
            {status}
          </span>
          {status === "recognizing text" && (
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {extractedText && !loading && (
        <div className="relative">
          <Textarea
            readOnly
            value={extractedText}
            className="h-64 resize-none"
            placeholder="Texto extraído aparecerá aqui..."
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleCopyToClipboard}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
