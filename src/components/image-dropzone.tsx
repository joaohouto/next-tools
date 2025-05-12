"use client";

import { useState, useRef, useEffect } from "react";
import { ImageIcon, UploadIcon } from "lucide-react";

export default function ImageDropzone({
  onUpload,
}: {
  onUpload: (file: File) => void;
}) {
  const [highlight, setHighlight] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) onUpload(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onUpload]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHighlight(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onUpload(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onUpload(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHighlight(true);
      }}
      onDragLeave={() => setHighlight(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`w-full h-48 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
        highlight ? "border-blue-400 bg-blue-400/20" : "border-foreground/20"
      }`}
    >
      <UploadIcon size={32} className="mb-2 text-muted-foreground" />
      <p className="text-muted-foreground text-sm text-center select-none">
        Arraste, clique ou cole (Ctrl+V) uma imagem
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
