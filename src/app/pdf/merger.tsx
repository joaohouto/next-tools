"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { DragDropContext, Draggable, DropResult } from "react-beautiful-dnd";
import { StrictModeDroppable } from "@/components/strict-mode-droppable";
import FileDropzone from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  File,
  FileImage,
  Files,
  GripVertical,
  X,
} from "lucide-react";
import { Spinner } from "@/components/spinner";
import PdfPreview from "./pdf-preview";
import { useEffect } from "react";
import { formatBytes } from "@/lib/utils";

export default function PdfMerger() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [mergedPdf, setMergedPdf] = useState<{
    url: string;
    size: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [outputFileName, setOutputFileName] = useState("merged.pdf");

  useEffect(() => {
    const newPreviews: { [key: string]: string } = { ...previews };
    let shouldUpdate = false;

    files.forEach((file) => {
      if (file.type.startsWith("image/") && !newPreviews[file.name]) {
        newPreviews[file.name] = URL.createObjectURL(file);
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      setPreviews(newPreviews);
    }

    // Limpa as URLs de objeto quando o componente é desmontado ou os arquivos mudam
    return () => {
      console.log("cleaned");

      Object.values(newPreviews).forEach((url) => {
        // Apenas revoga se for uma URL de objeto, não uma data URL
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [files]);

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFiles(items);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleMerge = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setMergedPdf(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        if (file.type === "application/pdf") {
          const existingPdfBytes = await file.arrayBuffer();
          const donorPdf = await PDFDocument.load(existingPdfBytes);
          const copiedPages = await pdfDoc.copyPages(
            donorPdf,
            donorPdf.getPageIndices()
          );
          copiedPages.forEach((page) => pdfDoc.addPage(page));
        } else if (file.type.startsWith("image/")) {
          const imageBytes = await file.arrayBuffer();
          const image = await pdfDoc.embedPng(imageBytes);
          const page = pdfDoc.addPage();
          const { width, height } = image.scale(1);
          page.setSize(width, height);
          page.drawImage(image, { x: 0, y: 0, width, height });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setMergedPdf({ url, size: blob.size });
    } catch (error) {
      console.error("Erro ao juntar os arquivos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col content-center gap-4">
      <FileDropzone
        multiple
        accept=".pdf,image/*"
        label="Arraste, clique ou cole (Ctrl+V) PDFs ou imagens"
        onUpload={(newFiles) => {
          const uniqueNewFiles = newFiles.filter(
            (newFile) =>
              !files.some(
                (existingFile) =>
                  existingFile.name === newFile.name &&
                  existingFile.size === newFile.size
              )
          );
          setFiles((prevFiles) => [...prevFiles, ...uniqueNewFiles]);
          setMergedPdf(null);
        }}
      />

      <div className="flex gap-2">
        <Button onClick={handleMerge} disabled={files.length === 0 || loading}>
          <Files />
          Juntar Arquivos
        </Button>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <StrictModeDroppable droppableId="files">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {files.map((file, index) => (
                <Draggable
                  key={file.name + index}
                  draggableId={file.name + index}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <Alert className="flex flex-col h-auto items-start">
                        <div className="flex justify-between items-center w-full mb-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <GripVertical className="text-muted-foreground size-4 flex-shrink-0" />
                            <div className="truncate">
                              <AlertTitle className="truncate">
                                {file.name}
                              </AlertTitle>
                              <AlertDescription>
                                {formatBytes(file.size)}
                              </AlertDescription>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        <div className="w-full p-2 bg-muted/50 rounded-md flex justify-center items-center min-h-[144px]">
                          {previews[file.name] ? (
                            <img
                              src={previews[file.name]}
                              alt={`Preview of ${file.name}`}
                              className="max-h-32 rounded-md"
                            />
                          ) : file.type === "application/pdf" ? (
                            <PdfPreview
                              file={file}
                              width={128}
                              onPreviewReady={(dataUrl) => {
                                setPreviews((prev) => ({
                                  ...prev,
                                  [file.name]: dataUrl,
                                }));
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center">
                              <File className="size-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </Alert>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>

      {loading && (
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span className="text-sm text-muted-foreground">Juntando...</span>
        </div>
      )}

      {mergedPdf && (
        <Alert className="flex justify-between items-center bg-green-100 dark:bg-green-900/30">
          <div className="flex items-center gap-2">
            <File />
            <div>
              <AlertTitle
                contentEditable
                suppressContentEditableWarning
                className="outline-none focus:ring-1 focus:ring-ring rounded-sm px-1"
                onBlur={(e) => {
                  const newName = e.currentTarget.textContent || "merged";
                  setOutputFileName(
                    newName.endsWith(".pdf") ? newName : `${newName}.pdf`
                  );
                }}
              >
                {outputFileName}
              </AlertTitle>
              <AlertDescription>{formatBytes(mergedPdf.size)}</AlertDescription>
            </div>
          </div>
          <a href={mergedPdf.url} download={outputFileName}>
            <Button size="icon">
              <Download />
            </Button>
          </a>
        </Alert>
      )}
    </div>
  );
}
