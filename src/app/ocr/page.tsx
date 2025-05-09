"use client";

import { CardAnimatedBorder } from "@/components/card-animated-border";
import ImageDropzone from "@/components/image-dropzone";
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
      <div className="w-fulll md:max-w-[680px] mx-auto grid md:grid-cols-2 grid-cols-1 content-center gap-4">
        <div className="">
          {image ? (
            <div className="bg-muted rounded-xl">
              <img src={image} alt="Preview" className="rounded-xl" />
            </div>
          ) : (
            <CardAnimatedBorder className="w-full h-[200px] text-neutral-300 dark:text-neutral-700 flex flex-col justify-center items-center">
              <ScanText size={32} />
            </CardAnimatedBorder>
          )}

          {loading && (
            <div className="mt-4 text-blue-500 font-semibold animate-pulse">
              Processando imagem...
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
