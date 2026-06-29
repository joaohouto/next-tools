"use client";

import { useState, useRef, useEffect } from "react";
import { UploadIcon } from "lucide-react";
import { Spinner } from "./spinner";
import { cn } from "@/lib/utils";

export default function FileDropzone({
  onUpload,
  accept,
  label,
  title,
  multiple,
  isLoading = false,
  className,
  icon,
}: {
  onUpload: (files: File[]) => void;
  accept?: string;
  label?: string;
  title?: string;
  multiple?: boolean;
  isLoading?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) {
  const [highlight, setHighlight] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null | undefined) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length > 0) onUpload(files);
  };

  const acceptsFile = (file: File) => {
    if (!accept || accept === "*/*" || accept === "*") return true;
    return accept.split(",").map((t) => t.trim()).some((type) => {
      if (type === "*/*" || type === "*") return true;
      if (type.startsWith(".")) return file.name.endsWith(type);
      if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
      return file.type === type;
    });
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && acceptsFile(file)) files.push(file);
        }
      }
      if (files.length > 0) onUpload(files);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onUpload, accept]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setHighlight(true); }}
      onDragLeave={() => setHighlight(false)}
      onDrop={(e) => { e.preventDefault(); setHighlight(false); processFiles(e.dataTransfer.files); }}
      onClick={() => !isLoading && inputRef.current?.click()}
      className={cn(
        "w-full flex flex-col items-center justify-center gap-3 py-10 px-6 border-2 rounded-2xl cursor-pointer transition-all select-none",
        highlight
          ? "border-primary bg-primary/5"
          : "border-dashed border-foreground/20 hover:border-foreground/40 bg-muted/30",
        isLoading && "pointer-events-none",
        className,
      )}
    >
      <div className="size-12 rounded-2xl bg-muted flex items-center justify-center">
        {isLoading
          ? <Spinner className="size-5" />
          : (icon ?? <UploadIcon size={22} className="text-muted-foreground" />)
        }
      </div>
      {title ? (
        <div className="text-center">
          <p className="text-sm font-medium">{title}</p>
          <p className={cn("text-xs text-muted-foreground mt-0.5 text-balance transition-opacity", isLoading && "opacity-50")}>
            {label ?? "Arraste, clique ou cole (Ctrl+V)"}
          </p>
        </div>
      ) : (
        <p className={cn("text-sm text-center text-balance transition-opacity", isLoading ? "text-muted-foreground/50" : "text-muted-foreground")}>
          {label ?? "Arraste, clique ou cole (Ctrl+V) um arquivo"}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? "*/*"}
        onChange={(e) => processFiles(e.target.files)}
        className="hidden"
        multiple={multiple}
        disabled={isLoading}
      />
    </div>
  );
}
