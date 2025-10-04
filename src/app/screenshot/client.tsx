"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Arrow,
  Line,
} from "react-konva";
import Konva from "konva";
import useImage from "use-image";

import "react-image-crop/dist/ReactCrop.css";

// --- Ícones para a barra de ferramentas (usando lucide-react) ---
import {
  MousePointer2,
  Square,
  ArrowRight,
  Highlighter,
  Eraser,
  Download,
  Trash2,
  Scissors,
  EyeOff,
} from "lucide-react";

// --- Função Auxiliar de Recorte ---
function getCroppedImg(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  fileName: string
): Promise<File> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return Promise.reject(new Error("Failed to get canvas context"));
  }

  const pixelRatio = window.devicePixelRatio;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const file = new File([blob], fileName, { type: "image/png" });
        resolve(file);
      },
      "image/png",
      1
    );
  });
}

// --- Tipos para nossas anotações ---
type Annotation = {
  id: string;
  type: Tool;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

type Tool = "select" | "rect" | "arrow" | "highlight" | "blur" | "pen";

// --- Componente Placeholder para o seu ImageDropzone ---
const ImageDropzone = ({
  onUpload,
  isLoading,
}: {
  onUpload: (files: File[]) => void;
  isLoading: boolean;
}) => (
  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
    <label htmlFor="file-upload" className="cursor-pointer">
      <p className="text-neutral-500 dark:text-neutral-400">
        Arraste e solte uma imagem aqui, ou clique para selecionar
      </p>
      <input
        id="file-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))}
      />
      {isLoading && <p>Carregando...</p>}
    </label>
  </div>
);

// --- Componente de Recorte (Crop) ---
const ImageCropper = ({
  imageSrc,
  onCropComplete,
  onCancel,
}: {
  imageSrc: string;
  onCropComplete: (image: File) => void;
  onCancel: () => void;
}) => {
  const [crop, setCrop] = useState<Crop>();
  const imageRef = useRef<HTMLImageElement>(null);

  const handleCrop = async () => {
    if (imageRef.current && crop?.width && crop?.height) {
      const croppedImageFile = await getCroppedImg(
        imageRef.current,
        crop,
        "cropped-image.png"
      );
      onCropComplete(croppedImageFile);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <ReactCrop
        crop={crop}
        onChange={(c, percentCrop) => setCrop(c)}
        aspect={undefined} // Recorte livre
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Imagem para recortar"
          style={{ maxHeight: "70vh" }}
        />
      </ReactCrop>
      <div className="flex gap-4 p-4 rounded-lg">
        <button
          onClick={handleCrop}
          className="px-4 py-2 bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90 rounded-md flex items-center gap-2"
        >
          <Scissors size={18} /> Confirmar Recorte
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-700 rounded-md"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// --- Componente Principal do Editor ---
const Editor = ({
  imageFile,
  onBack,
  onInitiateCrop,
}: {
  imageFile: File;
  onBack: () => void;
  onInitiateCrop: (dataUrl: string) => void;
}) => {
  const [tool, setTool] = useState<Tool>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const imageURL = URL.createObjectURL(imageFile);
  const [image] = useImage(imageURL);

  const handleMouseDown = (
    e: Konva.KonvaEventObject<globalThis.MouseEvent>
  ) => {
    if (tool === "select") return;
    setIsDrawing(true);
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: tool,
    };

    if (tool === "pen" || tool === "arrow" || tool === "highlight") {
      newAnnotation.points = [pos.x, pos.y, pos.x, pos.y];
    } else {
      newAnnotation.x = pos.x;
      newAnnotation.y = pos.y;
      newAnnotation.width = 0;
      newAnnotation.height = 0;
    }

    if (tool === "highlight") {
      newAnnotation.stroke = "#FFD700"; // Amarelo marca-texto
      newAnnotation.strokeWidth = 15;
      newAnnotation.opacity = 0.5;
    } else if (tool === "blur") {
      // A lógica do blur será aplicada no render
    } else if (tool !== "pen") {
      newAnnotation.stroke = "#ef4444"; // Vermelho
      newAnnotation.strokeWidth = 3;
    }

    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  const handleMouseMove = (
    e: Konva.KonvaEventObject<globalThis.MouseEvent>
  ) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id === prev[prev.length - 1].id) {
          const lastAnn = { ...ann };
          if (
            lastAnn.type === "pen" ||
            lastAnn.type === "arrow" ||
            lastAnn.type === "highlight"
          ) {
            lastAnn.points = [...(lastAnn.points || []), pos.x, pos.y];
          } else {
            lastAnn.width = pos.x - (lastAnn.x || 0);
            lastAnn.height = pos.y - (lastAnn.y || 0);
          }
          return lastAnn;
        }
        return ann;
      })
    );
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<globalThis.MouseEvent>) => {
    setIsDrawing(false);
  };

  const handleExport = () => {
    const uri = stageRef.current?.toDataURL({ mimeType: "image/png" });
    if (uri) {
      const link = document.createElement("a");
      link.download = "screenshot-editado.png";
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleStartCrop = () => {
    const uri = stageRef.current?.toDataURL({ mimeType: "image/png" });
    if (uri) {
      onInitiateCrop(uri);
    }
  };

  const handleReset = () => {
    setAnnotations([]);
  };

  // Efeito para adicionar o filtro de blur
  useEffect(() => {
    if (!image || !layerRef.current) return;
    const layer = layerRef.current;

    const blurredRects = annotations.filter((ann) => ann.type === "blur");

    const imageNode = layer.findOne("Image");

    // Limpa blurs antigos antes de redesenhar
    layer.find('[name^="blur-"]').forEach((node) => node.destroy());

    blurredRects.forEach((rect) => {
      if (
        imageNode &&
        rect.x !== undefined &&
        rect.y !== undefined &&
        rect.width !== undefined &&
        rect.height !== undefined
      ) {
        // Normaliza o retângulo para funcionar com arrasto em qualquer direção
        const x = rect.width > 0 ? rect.x : rect.x + rect.width;
        const y = rect.height > 0 ? rect.y : rect.y + rect.height;
        const width = Math.abs(rect.width);
        const height = Math.abs(rect.height);

        const blurNode = new Konva.Image({
          image: image,
          x: x,
          y: y,
          width: width,
          height: height,
          crop: { x, y, width, height },
          filter: Konva.Filters.Blur,
          blurRadius: 10,
          name: `blur-${rect.id}`,
        });
        layer.add(blurNode);
        blurNode.cache();
      }
    });

    layer.batchDraw();
  }, [annotations, image]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Barra de Ferramentas */}
      <div className="flex flex-wrap gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-md sticky top-4 z-10">
        <button
          onClick={onBack}
          title="Nova Imagem"
          className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md"
        >
          <Trash2 size={20} />
        </button>
        <div className="w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>

        <button
          onClick={() => setTool("select")}
          title="Selecionar"
          className={`p-2 rounded-md ${
            tool === "select"
              ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
              : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <MousePointer2 size={20} />
        </button>
        <button
          onClick={() => setTool("rect")}
          title="Retângulo"
          className={`p-2 rounded-md ${
            tool === "rect"
              ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
              : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <Square size={20} />
        </button>
        <button
          onClick={() => setTool("arrow")}
          title="Seta"
          className={`p-2 rounded-md ${
            tool === "arrow"
              ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
              : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <ArrowRight size={20} />
        </button>
        <button
          onClick={() => setTool("highlight")}
          title="Marca-Texto"
          className={`p-2 rounded-md ${
            tool === "highlight"
              ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
              : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <Highlighter size={20} />
        </button>
        <button
          onClick={() => setTool("blur")}
          title="Censurar (Blur)"
          className={`p-2 rounded-md ${
            tool === "blur"
              ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
              : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <EyeOff size={20} />
        </button>

        <div className="w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>
        <button
          onClick={handleStartCrop}
          title="Recortar"
          className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md"
        >
          <Scissors size={20} />
        </button>
        <button
          onClick={handleReset}
          title="Limpar Anotações"
          className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md"
        >
          <Eraser size={20} />
        </button>
        <button
          onClick={handleExport}
          title="Exportar Imagem"
          className="p-2 bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90 rounded-md"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Canvas de Edição */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
        <Stage
          width={image?.width || 0}
          height={image?.height || 0}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
        >
          <Layer ref={layerRef}>
            <KonvaImage image={image} />
            {annotations.map((ann) => {
              if (ann.type === "rect") {
                return <Rect key={ann.id} {...ann} />;
              }
              if (ann.type === "arrow") {
                return (
                  <Arrow
                    key={ann.id}
                    points={ann.points ?? []}
                    fill={ann.stroke}
                    stroke={ann.stroke}
                    strokeWidth={ann.strokeWidth}
                  />
                );
              }
              if (ann.type === "highlight") {
                return (
                  <Line
                    key={ann.id}
                    points={ann.points}
                    stroke={ann.stroke}
                    strokeWidth={ann.strokeWidth}
                    opacity={ann.opacity}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }
              if (
                ann.type === "blur" &&
                isDrawing &&
                ann.id === annotations[annotations.length - 1].id
              ) {
                return <Rect key={ann.id} {...ann} fill="rgba(0,0,255,0.3)" />;
              }
              return null;
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

// --- Componente da Página Principal ---
export default function ScreenshotEditorPage() {
  const [step, setStep] = useState<"upload" | "crop" | "edit">("upload");
  const [activeImage, setActiveImage] = useState<File | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleUpload = (files: File[]) => {
    if (files.length > 0) {
      setActiveImage(files[0]);
      setStep("edit");
    }
  };

  const handleInitiateCrop = (dataUrl: string) => {
    setImageToCrop(dataUrl);
    setStep("crop");
  };

  const handleCropComplete = (imageFile: File) => {
    setActiveImage(imageFile);
    setImageToCrop(null);
    setStep("edit");
  };

  const resetFlow = () => {
    setActiveImage(null);
    setImageToCrop(null);
    setStep("upload");
  };

  const cancelCrop = () => {
    setImageToCrop(null);
    setStep("edit"); // Volta para a edição sem alterar a imagem
  };

  const renderStep = () => {
    switch (step) {
      case "upload":
        return <ImageDropzone isLoading={loading} onUpload={handleUpload} />;
      case "crop":
        if (imageToCrop) {
          return (
            <ImageCropper
              imageSrc={imageToCrop}
              onCropComplete={handleCropComplete}
              onCancel={cancelCrop}
            />
          );
        }
        return null;
      case "edit":
        if (activeImage) {
          return (
            <Editor
              key={activeImage.name + activeImage.lastModified} // Força o remonte do editor
              imageFile={activeImage}
              onBack={resetFlow}
              onInitiateCrop={handleInitiateCrop}
            />
          );
        }
        return null;
      default:
        return <p>Algo deu errado.</p>;
    }
  };

  return (
    <div className="p-4 md:p-8 w-full min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <div className="w-full flex flex-col items-center gap-6">
        {isClient ? renderStep() : null}
      </div>
    </div>
  );
}
