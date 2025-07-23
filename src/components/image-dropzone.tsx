"use client";

import FileDropzone from "./file-dropzone";

export default function ImageDropzone({
  onUpload,
}: {
  onUpload: (file: File) => void;
}) {
  return (
    <FileDropzone
      onUpload={onUpload}
      accept="image/*"
      label="Arraste, clique ou cole (Ctrl+V) uma imagem"
    />
  );
}
