import type { ExifData, ImageAnalysis } from "./forensic-types";

// ─── EXIF via exifr ───────────────────────────────────────────────────────────

function fmtAperture(val: unknown): number | undefined {
  if (typeof val === "number") return Math.round(val * 10) / 10;
  return undefined;
}

function fmtShutter(val: unknown): string | undefined {
  if (typeof val === "number") {
    if (val >= 1) return `${val}s`;
    return `1/${Math.round(1 / val)}s`;
  }
  return undefined;
}

function fmtFlash(val: unknown): string | undefined {
  if (typeof val === "number") {
    const fired = (val & 0x1) !== 0;
    return fired ? "Disparou" : "Não disparou";
  }
  if (typeof val === "string") return val;
  return undefined;
}

function toDateStr(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return String(val);
}

export async function extractExif(file: File): Promise<ExifData> {
  const exifr = await import("exifr");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await (exifr.parse as any)(file, {
    tiff: true,
    xmp: true,
    iptc: true,
    icc: false,
    jfif: false,
    ihdr: true,
    gps: true,
    thumbnail: true,
    mergeOutput: false,
  }).catch(() => null);

  if (!raw) return {};

  const exif = raw.exif ?? raw;
  const xmpBlock = raw.xmp;
  const iptcBlock = raw.iptc;
  const gpsBlock = raw.gps;
  const ifdBlock = raw.ifd0 ?? raw.tiff ?? {};

  let thumbnail: string | undefined;
  try {
    const thumb = await exifr.thumbnail(file);
    if (thumb) {
      const blob = new Blob([thumb as BlobPart], { type: "image/jpeg" });
      thumbnail = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch { /* thumbnail optional */ }

  const gps =
    gpsBlock &&
    typeof gpsBlock.latitude === "number" &&
    typeof gpsBlock.longitude === "number"
      ? {
          latitude: gpsBlock.latitude,
          longitude: gpsBlock.longitude,
          altitude: typeof gpsBlock.altitude === "number" ? gpsBlock.altitude : undefined,
        }
      : undefined;

  return {
    make: ifdBlock.Make ?? exif?.Make,
    model: ifdBlock.Model ?? exif?.Model,
    serialNumber: exif?.BodySerialNumber ?? exif?.CameraSerialNumber ?? ifdBlock.SerialNumber,
    iso: exif?.ISO,
    aperture: fmtAperture(exif?.FNumber),
    shutterSpeed: fmtShutter(exif?.ExposureTime),
    focalLength: typeof exif?.FocalLength === "number" ? Math.round(exif.FocalLength) : undefined,
    flash: fmtFlash(exif?.Flash),
    dateTimeOriginal: toDateStr(exif?.DateTimeOriginal),
    dateTimeDigitized: toDateStr(exif?.DateTimeDigitized),
    dateTime: toDateStr(ifdBlock.DateTime),
    width: exif?.ExifImageWidth ?? ifdBlock.ImageWidth,
    height: exif?.ExifImageHeight ?? ifdBlock.ImageLength,
    orientation: ifdBlock.Orientation ?? exif?.Orientation,
    xResolution: ifdBlock.XResolution,
    yResolution: ifdBlock.YResolution,
    colorSpace: exif?.ColorSpace === 1 ? "sRGB" : exif?.ColorSpace === 65535 ? "Uncalibrated" : undefined,
    software: ifdBlock.Software ?? exif?.Software,
    thumbnail,
    gps,
    xmp: xmpBlock && Object.keys(xmpBlock).length > 0 ? xmpBlock : undefined,
    iptc: iptcBlock && Object.keys(iptcBlock).length > 0 ? iptcBlock : undefined,
  };
}

// ─── Canvas-based image analysis ─────────────────────────────────────────────

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

export async function analyzeImage(file: File): Promise<ImageAnalysis> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const W = img.naturalWidth, H = img.naturalHeight;
        const scale = Math.min(1, 200 / Math.max(W, H));
        const cw = Math.max(1, Math.round(W * scale));
        const ch = Math.max(1, Math.round(H * scale));

        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, cw, ch);
        const data = ctx.getImageData(0, 0, cw, ch).data;

        // Histograms (256 bins)
        const histR = new Array<number>(256).fill(0);
        const histG = new Array<number>(256).fill(0);
        const histB = new Array<number>(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          histR[data[i]]++;
          histG[data[i + 1]]++;
          histB[data[i + 2]]++;
        }

        // RGB distribution (percentage)
        const total = cw * ch;
        let sumR = 0, sumG = 0, sumB = 0;
        for (let i = 0; i < data.length; i += 4) {
          sumR += data[i]; sumG += data[i + 1]; sumB += data[i + 2];
        }
        const avg = (sumR + sumG + sumB) / 3 || 1;
        const rgbDistribution = {
          r: Math.round((sumR / (total * 255)) * 100),
          g: Math.round((sumG / (total * 255)) * 100),
          b: Math.round((sumB / (total * 255)) * 100),
        };

        // Dominant colors (32px quantization)
        const smallCanvas = document.createElement("canvas");
        smallCanvas.width = 32; smallCanvas.height = 32;
        const sCtx = smallCanvas.getContext("2d")!;
        sCtx.drawImage(img, 0, 0, 32, 32);
        const sData = sCtx.getImageData(0, 0, 32, 32).data;
        const colorMap = new Map<string, number>();
        for (let i = 0; i < sData.length; i += 4) {
          // Quantize to 5 bits per channel
          const r = sData[i] & 0xf8;
          const g = sData[i + 1] & 0xf8;
          const b = sData[i + 2] & 0xf8;
          const key = toHex(r, g, b);
          colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
        }
        const dominantColors = [...colorMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color);

        // LSB steganography detection (blue channel chi-squared)
        const pairs = new Array<number>(128).fill(0); // pair[k] = count of pixels where blue & 0xfe == 2k
        for (let i = 2; i < data.length; i += 4) {
          pairs[data[i] >> 1]++;
        }
        const n = cw * ch;
        let chi2 = 0;
        for (let k = 0; k < 128; k++) {
          const obs0 = pairs[k]; // even
          // For natural images, pairs of adjacent values should be approximately equal
          // We need both odd and even counts — rebuild from histogram
          const obs1 = histB[(k << 1) + 1]; // odd pixel counts
          const obs0actual = histB[k << 1];
          const expected = (obs0actual + obs1) / 2;
          if (expected > 0) {
            chi2 += (obs0actual - expected) ** 2 / expected;
            chi2 += (obs1 - expected) ** 2 / expected;
          }
        }
        // With 127 degrees of freedom, critical value ~150 for p=0.05
        let steganography: ImageAnalysis["steganography"] =
          chi2 < 100 ? "unlikely" : chi2 < 200 ? "inconclusive" : "suspicious";

        URL.revokeObjectURL(url);
        resolve({
          width: W,
          height: H,
          dominantColors,
          rgbDistribution,
          histogram: { r: histR, g: histG, b: histB },
          steganography,
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}
