"use client";

import FileDropzone from "./file-dropzone";

export default function ImageDropzone({
  onUpload,
  isLoading,
}: {
  onUpload: (files: File[]) => void;
  isLoading?: boolean;
}) {
  return (
    <FileDropzone
      onUpload={onUpload}
      isLoading={isLoading}
      accept="image/*"
      label="Arraste, clique ou cole (Ctrl+V) uma imagem"
    />
  );
}
