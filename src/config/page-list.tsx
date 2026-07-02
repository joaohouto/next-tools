import {
  Atom,
  Lock,
  NotepadText,
  QrCode,
  Ruler,
  ScanSearch,
  ScanText,
  SquareTerminal,
  Timer,
  Smile,
  Camera,
  AppWindow,
  Signature,
  NotebookPen,
  GitCompare,
  FileText,
  Images,
  ArrowLeftRight,
} from "lucide-react";

import type { ToolUsageRecord } from "@/hooks/use-tool-usage";

export type PageCategory = "Geradores" | "Arquivos" | "Produtividade";

export const UNORDERED_LIST = [
  // Geradores — produzem algo a partir de parâmetros
  {
    title: "Senha",
    description: "Gere senhas fortes e aleatórias com controle de comprimento e caracteres.",
    path: "/password",
    icon: <Lock />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "QRCode",
    description: "Crie QR codes a partir de qualquer texto, URL ou dado instantaneamente.",
    path: "/qrcode",
    icon: <QrCode />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Ícone",
    description: "Crie e exporte ícones personalizados para apps, projetos e apresentações.",
    path: "/icon",
    icon: <Atom />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Emoji",
    description: "Encontre e copie emojis rapidamente com busca por nome ou categoria.",
    path: "/emoji",
    icon: <Smile />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Redação",
    description: "Gere folhas de redação personalizadas prontas para impressão.",
    path: "/essay",
    icon: <NotepadText />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Caligrafia",
    description: "Crie folhas de exercício de caligrafia com pauta guia para impressão.",
    path: "/calligraphy",
    icon: <Signature />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Pautas",
    description: "Gere folhas pautadas personalizadas com espaçamento e margens configuráveis.",
    path: "/line-sheet",
    icon: <NotebookPen />,
    category: "Geradores" as PageCategory,
  },

  // Arquivos — processam ou analisam arquivos existentes
  {
    title: "Imagens",
    description: "Comprima, converta, redimensione e edite imagens direto no navegador.",
    path: "/imagem",
    icon: <Images />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "PDF",
    description: "Mescle, divida, organize, comprima e converta arquivos PDF sem upload.",
    path: "/pdf",
    icon: <FileText />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "Converter",
    description: "Converta imagens, PDFs, planilhas e documentos entre formatos, sem upload.",
    path: "/converter",
    icon: <ArrowLeftRight />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "OCR",
    description: "Extraia texto de imagens com reconhecimento óptico de caracteres.",
    path: "/ocr",
    icon: <ScanText />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "Diferença",
    description: "Compare dois textos e visualize as diferenças linha a linha.",
    path: "/diff",
    icon: <GitCompare />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "Forense",
    description: "Analise metadados, hash e propriedades ocultas de qualquer arquivo.",
    path: "/forense",
    icon: <ScanSearch />,
    category: "Arquivos" as PageCategory,
  },

  // Produtividade — ferramentas de uso contínuo
  {
    title: "Pomodoro",
    description: "Temporizador Pomodoro para sessões de foco e pausas organizadas.",
    path: "/pomodoro",
    icon: <Timer />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "Teleprompter",
    description: "Leia scripts com rolagem automática e controle de velocidade.",
    path: "/teleprompter",
    icon: <SquareTerminal />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "ZapLink",
    description: "Abra conversas no WhatsApp sem precisar salvar o número na agenda.",
    path: "/zaplink",
    icon: <AppWindow />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "Webcam",
    description: "Visualize e capture vídeo e fotos diretamente pela webcam.",
    path: "/webcam",
    icon: <Camera />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "Nível",
    description: "Meça inclinação de superfícies com o acelerômetro do dispositivo.",
    path: "/level",
    icon: <Ruler />,
    category: "Produtividade" as PageCategory,
  },
];

export const PAGE_LIST = [...UNORDERED_LIST].sort((a, b) =>
  a.title.localeCompare(b.title),
);

export const CATEGORY_ORDER: PageCategory[] = [
  "Geradores",
  "Arquivos",
  "Produtividade",
];

export function getSortedByUsage(usage: ToolUsageRecord = {}) {
  return [...UNORDERED_LIST].sort((a, b) => {
    const diff = (usage[b.path] ?? 0) - (usage[a.path] ?? 0);
    return diff !== 0 ? diff : a.title.localeCompare(b.title);
  });
}
