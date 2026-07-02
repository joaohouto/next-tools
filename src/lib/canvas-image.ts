export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Rasterizes an image file to a canvas and encodes it as the target mime type. */
export function imageFileToBlob(file: File, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new globalThis.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      if (mime === "image/jpeg" || mime === "image/bmp") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("failed to encode image")); return; }
        resolve(blob);
      }, mime, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("failed to load image")); };
    img.src = url;
  });
}
