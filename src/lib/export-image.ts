import * as htmlToImage from "html-to-image";
import { elementToSVG, inlineResources } from "dom-to-svg";
import { toast } from "sonner";

interface QRCodeConfig {
  format: string;
  size?: number;
}

export const exportAsImage = async (
  element: HTMLElement,
  imageFileName: string
): Promise<void> => {
  try {
    const imageUrl = await htmlToImage.toPng(element, {
      canvasHeight: 990 * 1.5,
      canvasWidth: 770 * 1.5,
      cacheBust: true,
      style: {
        borderRadius: "0",
        fontFamily: "Inter",
      },
    });
    downloadImage(imageUrl, imageFileName);
  } catch (err) {
    console.error("Erro ao exportar imagem:", err);
  }
};

export const copyQRCode = async (
  element: HTMLElement | null,
  config: QRCodeConfig
): Promise<void> => {
  if (!element) {
    toast.error("Erro ao copiar imagem!");
    return;
  }

  try {
    if (config.format === "png") {
      await copyQRCodePNG(element, config);
      toast.success("Imagem copiada!");
    } else {
      await copyQRCodeSVG(element);
      toast.success("Imagem copiada!");
    }
  } catch (err) {
    toast.error("Erro ao copiar imagem!");
    console.error("Erro ao copiar QR Code:", err);
  }
};

const copyQRCodePNG = async (
  element: HTMLElement | null,
  config: QRCodeConfig
): Promise<void> => {
  if (!element) {
    toast.error("Erro ao copiar imagem!");
    return;
  }

  try {
    const imageUrl = await htmlToImage.toPng(element, {
      canvasHeight: config.size || 580,
      canvasWidth: config.size || 580,
      cacheBust: true,
      style: {
        borderRadius: "0",
        border: "0",
      },
    });
    const blob = await (await fetch(imageUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch (err) {
    console.error("Erro ao copiar QR Code PNG:", err);
  }
};

const copyQRCodeSVG = async (element: HTMLElement): Promise<void> => {
  try {
    const svgDocument = elementToSVG(element);
    await inlineResources(svgDocument.documentElement);
    const svgString = new XMLSerializer().serializeToString(svgDocument);
    await navigator.clipboard.writeText(svgString);
    console.log("QRCode copiado!");
  } catch (err) {
    console.error("Erro ao copiar QR Code SVG:", err);
  }
};

export const exportQRCode = async (
  element: HTMLElement | null,
  config: QRCodeConfig,
  imageFileName: string
): Promise<void> => {
  if (!element) {
    toast.error("Erro ao exportar imagem!");
    return;
  }

  try {
    if (config.format === "png") {
      await exportQRCodePNG(element, config, imageFileName);
      toast.success("Imagem exportada!");
    } else {
      await exportQRCodeSVG(element, config, imageFileName);
      toast.success("Imagem exportada!");
    }
  } catch (err) {
    toast.error("Erro ao exportar imagem!");

    console.error("Erro ao exportar QR Code:", err);
  }
};

const exportQRCodePNG = async (
  element: HTMLElement,
  config: QRCodeConfig,
  imageFileName: string
): Promise<void> => {
  try {
    const imageUrl = await htmlToImage.toPng(element, {
      canvasHeight: config.size || 580,
      canvasWidth: config.size || 580,
      cacheBust: true,
      style: {
        borderRadius: "0",
        border: "0",
      },
    });
    downloadImage(imageUrl, `${clearFileName(imageFileName)}.png`);
  } catch (err) {
    console.error("Erro ao exportar QR Code PNG:", err);
  }
};

const exportQRCodeSVG = async (
  element: HTMLElement,
  config: QRCodeConfig,
  imageFileName: string
): Promise<void> => {
  try {
    const svgDocument = elementToSVG(element);
    await inlineResources(svgDocument.documentElement);
    const svgString = new XMLSerializer().serializeToString(svgDocument);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    downloadImage(url, `${clearFileName(imageFileName)}.svg`);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error("Erro ao exportar QR Code SVG:", err);
  }
};

const downloadImage = (blob: string, fileName: string): void => {
  const fakeLink = document.createElement("a");
  fakeLink.style.display = "none";
  fakeLink.download = fileName;
  fakeLink.href = blob;
  document.body.appendChild(fakeLink);
  fakeLink.click();
  document.body.removeChild(fakeLink);
  fakeLink.remove();
};

const clearFileName = (name: string): string => {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
};
