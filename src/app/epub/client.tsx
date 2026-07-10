"use client";

import { useCallback, useState } from "react";
import { BookOpen, RefreshCw, FileText } from "lucide-react";
import FileDropzone from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";
import { parseEpub } from "./epub-reader";
import { buildEpub } from "./epub-writer";
import { parsePdf } from "./pdf-reader";
import { buildPdf } from "./pdf-writer";

type Status = "idle" | "processing" | "done" | "error";
type Direction = "epub-to-pdf" | "pdf-to-epub";

function isEpub(file: File) {
  return file.type === "application/epub+zip" || /\.epub$/i.test(file.name);
}
function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function triggerDownload(bytes: Uint8Array, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export default function EpubClient() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);

  const handleUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!isEpub(file) && !isPdf(file)) {
      toast.error("Envie um arquivo .epub ou .pdf");
      return;
    }

    setSourceFile(file);
    setStatus("processing");
    setError(null);
    setProgress(null);

    try {
      if (isEpub(file)) {
        setDirection("epub-to-pdf");
        setProgress("Lendo EPUB…");
        const book = await parseEpub(file);
        setProgress("Gerando PDF…");
        const bytes = await buildPdf(book);
        const name = file.name.replace(/\.epub$/i, "") + ".pdf";
        triggerDownload(bytes, name, "application/pdf");
        setResultName(name);
      } else {
        setDirection("pdf-to-epub");
        const book = await parsePdf(file, (page, total) => setProgress(`Extraindo texto… página ${page}/${total}`));
        setProgress("Gerando EPUB…");
        const bytes = buildEpub(book);
        const name = file.name.replace(/\.pdf$/i, "") + ".epub";
        triggerDownload(bytes, name, "application/epub+zip");
        setResultName(name);
      }
      setStatus("done");
      toast.success("Conversão concluída!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      setStatus("error");
      toast.error(`Falha na conversão: ${msg}`);
    }
  }, []);

  const reset = () => {
    setStatus("idle");
    setProgress(null);
    setError(null);
    setResultName(null);
    setSourceFile(null);
    setDirection(null);
  };

  if (status === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col gap-3">
          <FileDropzone
            onUpload={handleUpload}
            accept=".epub,.pdf,application/epub+zip,application/pdf"
            icon={<BookOpen size={22} className="text-muted-foreground" />}
            title="Conversor EPUB ⇄ PDF"
            label="Arraste ou clique para enviar um .epub ou .pdf"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
        {status === "processing" && (
          <>
            <Spinner />
            <div>
              <p className="text-sm font-medium">{sourceFile?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{progress ?? "Processando…"}</p>
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{resultName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {direction === "epub-to-pdf" ? "Convertido de EPUB para PDF" : "Convertido de PDF para EPUB"}
              </p>
            </div>
            <Button onClick={reset}>
              <RefreshCw size={14} className="mr-1.5" /> Converter outro arquivo
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive w-full">
              {error}
            </div>
            <Button variant="outline" onClick={reset}>
              <RefreshCw size={14} className="mr-1.5" /> Tentar novamente
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
