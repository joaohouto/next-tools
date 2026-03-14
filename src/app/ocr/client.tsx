"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
import { ScanText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import Tesseract from "tesseract.js";
import { toast } from "sonner";

export default function OcrPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!image) return;

    setLoading(true);
    setText("");

    Tesseract.recognize(image, "por")
      .then(({ data: { text } }) => {
        setText(text);
      })
      .catch((err) => {
        console.error("Erro OCR:", err);
        toast.error("Erro ao processar imagem. Tente novamente.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [image]);

  // Revogar object URL ao desmontar ou trocar imagem
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleUpload = (files: File[]) => {
    if (files.length === 0) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(files[0]);
    objectUrlRef.current = url;
    setImage(url);
  };

  return (
    <div className="p-6 w-full min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col content-center gap-4">
        <PageHeader
          title="Reconhecer Texto"
          description="Extraia texto de imagens."
          icon={<ScanText className="w-5 h-5" />}
        />
        <ImageDropzone
          isLoading={loading}
          onUpload={handleUpload}
        />

        <div className="font-mono text-justify text-sm p-4 bg-muted rounded-xl w-full">
          {text || "Nenhum texto encontrado ainda."}
        </div>

        <div className="flex flex-col">
          {image ? (
            <img
              src={image}
              alt="Preview"
              className={`rounded-xl border w-full h-auto ${
                loading && "animate-pulse opacity-1/2"
              }`}
            />
          ) : (
            <CardAnimatedBorder className="!w-full text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center">
              <ScanText size={32} />
            </CardAnimatedBorder>
          )}
        </div>
      </div>
    </div>
  );
}
