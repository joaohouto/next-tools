export type ImageMode =
  | "idle" | "choosing"
  | "compress" | "resize" | "convert"
  | "remove-bg" | "remove-color" | "vectorize" | "palette";

export type ItemStatus = "idle" | "processing" | "done" | "error";

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  resultUrl?: string;
  resultSize?: number;
  status: ItemStatus;
}

export const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0,0 10px,10px -10px,-10px 0px",
  backgroundColor: "white",
};
