"use client";

import { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";

export default function OcrPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              const url = URL.createObjectURL(blob);
              setImage(url);
              setLoading(true);

              Tesseract.recognize(url, "por", {
                logger: (m) => console.log(m),
              }).then(({ data: { text } }) => {
                setText(text);
                setLoading(false);
              });
            }
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div className="p-8 flex flex-col gap-4 items-center min-h-screen">
      <h1 className="text-2xl font-bold">OCR no Ctrl+V</h1>
      <div
        ref={dropRef}
        className="w-96 h-60 border-2 border-dashed rounded-md border-neutral-400 flex items-center justify-center text-neutral-500"
      >
        Cole uma imagem aqui (Ctrl+V)
      </div>

      {image && <img src={image} alt="Pasted" className="w-96 mt-4" />}

      {loading && (
        <div className="mt-4 text-blue-500 font-semibold animate-pulse">
          Processando imagem...
        </div>
      )}

      {!loading && text && (
        <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md w-96">
          <p>{text}</p>
        </div>
      )}
    </div>
  );
}
