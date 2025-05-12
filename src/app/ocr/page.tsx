"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
import { Spinner } from "@/components/spinner";
import { Image, ScanText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";

export default function OcrPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const dropRef = useRef<HTMLDivElement>(null);

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
      <div className="w-full md:max-w-[680px] mx-auto grid md:grid-cols-2 grid-cols-1 content-center gap-4">
        <div className="space-y-4">
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

          {loading && (
            <div className="flex items-center justify-center gap-2">
              <Spinner />
              <span className="text-sm text-muted-foreground">Processando</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <ImageDropzone
            onUpload={(file) => {
              const imageUrl = URL.createObjectURL(file);
              setImage(imageUrl);
            }}
          />

          <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-full">
            {text || "Nenhum texto econtrado ainda."}
          </div>
        </div>
      </div>
    </div>
  );
}
