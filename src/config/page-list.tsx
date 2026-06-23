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

export type PageCategory = "Imagens" | "Texto" | "Produtividade" | "Utilidades";

export const UNORDERED_LIST = [
  // Imagens
  { title: "Imagens", path: "/imagem", icon: <Images />, category: "Imagens" as PageCategory },

  // Texto
  { title: "OCR",                  path: "/ocr",          icon: <ScanText />,    category: "Texto" as PageCategory },
  { title: "Folha de Redação",     path: "/essay",        icon: <NotepadText />, category: "Texto" as PageCategory },
  { title: "Folhas de Caligrafia", path: "/calligraphy",  icon: <Signature />,   category: "Texto" as PageCategory },
  { title: "Folhas Pautadas",      path: "/line-sheet",   icon: <NotebookPen />, category: "Texto" as PageCategory },
  { title: "Comparar Textos",      path: "/diff",         icon: <GitCompare />,  category: "Texto" as PageCategory },

  // Produtividade
  { title: "Pomodoro",     path: "/pomodoro",     icon: <Timer />,         category: "Produtividade" as PageCategory },
  { title: "Teleprompter", path: "/teleprompter", icon: <SquareTerminal />,category: "Produtividade" as PageCategory },
  { title: "ZapLink",      path: "/zaplink",      icon: <AppWindow />,     category: "Produtividade" as PageCategory },

  // Utilidades
  { title: "QRCode",          path: "/qrcode",       icon: <QrCode />,    category: "Utilidades" as PageCategory },
  { title: "Gerador de Senha",path: "/password",     icon: <Lock />,      category: "Utilidades" as PageCategory },
  { title: "Emoji",           path: "/emoji",        icon: <Smile />,     category: "Utilidades" as PageCategory },
  { title: "Nível Bolha",     path: "/bubble-level", icon: <Ruler />,     category: "Utilidades" as PageCategory },
  { title: "Webcam",          path: "/webcam",       icon: <Camera />,    category: "Utilidades" as PageCategory },
  { title: "Estúdio de Ícone",path: "/icon",         icon: <Atom />,      category: "Utilidades" as PageCategory },
  { title: "PDF",             path: "/pdf",          icon: <FileText />,  category: "Utilidades" as PageCategory },
  { title: "Analisador Forense", path: "/forense",  icon: <ScanSearch />,category: "Utilidades" as PageCategory },
];

export const PAGE_LIST = [...UNORDERED_LIST].sort((a, b) =>
  a.title.localeCompare(b.title),
);

export const CATEGORY_ORDER: PageCategory[] = [
  "Imagens",
  "Texto",
  "Produtividade",
  "Utilidades",
];

export function getSortedByUsage(usage: ToolUsageRecord = {}) {
  return [...UNORDERED_LIST].sort((a, b) => {
    const diff = (usage[b.path] ?? 0) - (usage[a.path] ?? 0);
    return diff !== 0 ? diff : a.title.localeCompare(b.title);
  });
}
