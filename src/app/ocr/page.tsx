"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
import { Spinner } from "@/components/spinner";
import { ScanText } from "lucide-react";
import { useState, useEffect } from "react";
import Tesseract from "tesseract.js";

export default function OcrPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (image) {
      setLoading(true);

      Tesseract.recognize(image, "por", {
        logger: (m) => console.log(m),
      }).then(({ data: { text } }) => {
        setText(text);
        setLoading(false);
      });
    }
  }, [image]);

  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col content-center gap-4">
        <ImageDropzone
          onUpload={(files) => {
            if (files.length > 0) {
              const imageUrl = URL.createObjectURL(files[0]);
              setImage(imageUrl);
            }
          }}
        />

        <div className="font-mono text-justify text-sm p-4 bg-muted rounded-xl w-full">
          {text || "Nenhum texto econtrado ainda."}
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2">
              <Spinner />
              <span className="text-sm text-muted-foreground">Processando</span>
            </div>
          )}

          {image ? (
            <img
              src={image}
              alt="Preview"
              className={`rounded-xl border w-full h-auto ${
                loading && "animate-pulse opacity-1/2"
              }`}
            />
          ) : (
            <CardAnimatedBorder className="w-full text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center">
              <ScanText size={32} />
            </CardAnimatedBorder>
          )}
        </div>
      </div>
    </div>
  );
}
