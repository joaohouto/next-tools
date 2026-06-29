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
} from "lucide-react";

import type { ToolUsageRecord } from "@/hooks/use-tool-usage";

export type PageCategory = "Geradores" | "Arquivos" | "Produtividade";

export const UNORDERED_LIST = [
  // Geradores — produzem algo a partir de parâmetros
  {
    title: "Senha",
    path: "/password",
    icon: <Lock />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "QRCode",
    path: "/qrcode",
    icon: <QrCode />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Ícone",
    path: "/icon",
    icon: <Atom />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Emoji",
    path: "/emoji",
    icon: <Smile />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Caligrafia",
    path: "/calligraphy",
    icon: <Signature />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Pautas",
    path: "/line-sheet",
    icon: <NotebookPen />,
    category: "Geradores" as PageCategory,
  },

  // Arquivos — processam ou analisam arquivos existentes
  {
    title: "Imagens",
    path: "/imagem",
    icon: <Images />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "PDF",
    path: "/pdf",
    icon: <FileText />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "OCR",
    path: "/ocr",
    icon: <ScanText />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "Diferença",
    path: "/diff",
    icon: <GitCompare />,
    category: "Arquivos" as PageCategory,
  },
  {
    title: "Forense",
    path: "/forense",
    icon: <ScanSearch />,
    category: "Arquivos" as PageCategory,
  },

  // Produtividade — ferramentas de uso contínuo
  {
    title: "Pomodoro",
    path: "/pomodoro",
    icon: <Timer />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "Redação",
    path: "/essay",
    icon: <NotepadText />,
    category: "Geradores" as PageCategory,
  },
  {
    title: "Teleprompter",
    path: "/teleprompter",
    icon: <SquareTerminal />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "ZapLink",
    path: "/zaplink",
    icon: <AppWindow />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "Webcam",
    path: "/webcam",
    icon: <Camera />,
    category: "Produtividade" as PageCategory,
  },
  {
    title: "Nível",
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
