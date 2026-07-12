// Error Level Analysis: re-compress the image at a fixed quality and
// compute the amplified pixel-level difference. Areas that were edited
// tend to show higher error levels than unmodified regions because they
// have been compressed multiple times at different quality settings.
// Only meaningful for JPEG (lossy). PNG/WebP are handled gracefully but
// the result is less informative since they use lossless compression.

export interface ElaResult {
  dataUrl: string;
  quality: number;
  scale: number;
  maxError: number; // highest channel delta found (0-255), useful for calibration
}

const MAX_SIDE = 2000; // cap canvas size to keep memory reasonable

export async function computeEla(
  file: File,
  quality = 0.75,
  scale = 10,
): Promise<ElaResult> {
  return new Promise((resolve, reject) => {
    const origUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(origUrl);

      // Downsample if needed
      const ratio = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const W = Math.max(1, Math.round(img.naturalWidth * ratio));
      const H = Math.max(1, Math.round(img.naturalHeight * ratio));

      // Draw original at display size
      const origCanvas = document.createElement("canvas");
      origCanvas.width = W;
      origCanvas.height = H;
      const origCtx = origCanvas.getContext("2d")!;
      origCtx.drawImage(img, 0, 0, W, H);
      const origData = origCtx.getImageData(0, 0, W, H).data;

      // Re-compress at target quality and reload
      origCanvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("toBlob falhou")); return; }
          const reUrl = URL.createObjectURL(blob);
          const reImg = new Image();

          reImg.onload = () => {
            URL.revokeObjectURL(reUrl);

            const reCanvas = document.createElement("canvas");
            reCanvas.width = W;
            reCanvas.height = H;
            const reCtx = reCanvas.getContext("2d")!;
            reCtx.drawImage(reImg, 0, 0, W, H);
            const reData = reCtx.getImageData(0, 0, W, H).data;

            // Compute amplified difference
            const elaCanvas = document.createElement("canvas");
            elaCanvas.width = W;
            elaCanvas.height = H;
            const elaCtx = elaCanvas.getContext("2d")!;
            const elaImg = elaCtx.createImageData(W, H);

            let maxError = 0;
            for (let i = 0; i < origData.length; i += 4) {
              const dr = Math.abs(origData[i]     - reData[i]);
              const dg = Math.abs(origData[i + 1] - reData[i + 1]);
              const db = Math.abs(origData[i + 2] - reData[i + 2]);
              maxError = Math.max(maxError, dr, dg, db);
              elaImg.data[i]     = Math.min(255, dr * scale);
              elaImg.data[i + 1] = Math.min(255, dg * scale);
              elaImg.data[i + 2] = Math.min(255, db * scale);
              elaImg.data[i + 3] = 255;
            }

            elaCtx.putImageData(elaImg, 0, 0);
            resolve({ dataUrl: elaCanvas.toDataURL("image/png"), quality, scale, maxError });
          };

          reImg.onerror = () => {
            URL.revokeObjectURL(reUrl);
            reject(new Error("Falha ao carregar imagem recomprimida"));
          };
          reImg.src = reUrl;
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(origUrl);
      reject(new Error("Falha ao carregar imagem original"));
    };
    img.src = origUrl;
  });
}
