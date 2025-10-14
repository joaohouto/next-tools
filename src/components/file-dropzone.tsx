"use client";

import { useState, useRef, useEffect } from "react";
import { UploadIcon } from "lucide-react";
import { Spinner } from "./spinner";
import { cn } from "@/lib/utils";

export default function FileDropzone({
  onUpload,
  accept,
  label,
  multiple,
  isLoading = false,
  className,
}: {
  onUpload: (files: File[]) => void;
  accept?: string;
  label?: string;
  multiple?: boolean;
  isLoading?: boolean;
  className?: string;
}) {
  const [highlight, setHighlight] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null | undefined) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length > 0) {
      onUpload(files);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        const files: File[] = [];
        for (let item of items) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              if (accept) {
                const acceptedTypes = accept.split(",").map((t) => t.trim());
                if (
                  acceptedTypes.some((type) => {
                    if (type.startsWith(".")) {
                      return file.name.endsWith(type);
                    }
                    if (type.endsWith("/*")) {
                      return file.type.startsWith(type.slice(0, -1));
                    }
                    return file.type === type;
                  })
                ) {
                  files.push(file);
                }
              } else {
                files.push(file);
              }
            }
          }
        }
        if (files.length > 0) {
          onUpload(files);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onUpload, accept]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHighlight(false);
    processFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
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
      className={cn(
        `w-full h-48 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          highlight ? "border-blue-400 bg-blue-400/20" : "border-foreground/20"
        }`,
        className
      )}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <UploadIcon size={24} className="text-muted-foreground" />
      )}

      <p className="text-muted-foreground text-sm text-center select-none mt-2">
        {label || "Arraste, clique ou cole (Ctrl+V) um arquivo"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept || "*/*"}
        onChange={handleFileChange}
        className="hidden"
        multiple={multiple}
        disabled={isLoading}
      />
    </div>
  );
}
