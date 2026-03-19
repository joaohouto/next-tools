import {
  Atom,
  Lock,
  NotepadText,
  QrCode,
  Ruler,
  ScanText,
  SquareTerminal,
  Timer,
  Smile,
  Camera,
  BookImage,
  Eraser,
  PenTool,
  AppWindow,
  Signature,
  NotebookPen,
  ImageDown,
  Scaling,
  Repeat2,
  Palette,
  GitCompare,
  Fish,
} from "lucide-react";

export type PageCategory = "Imagens" | "Texto" | "Produtividade" | "Utilidades" | "Diversão";

export const UNORDERED_LIST = [
  // Imagens
  { title: "Remover Fundo",       path: "/remove-bg",    icon: <BookImage />, category: "Imagens" as PageCategory },
  { title: "Remover Cor",         path: "/remove-color", icon: <Eraser />,    category: "Imagens" as PageCategory },
  { title: "Vetorizar Logo",      path: "/vectorizer",   icon: <PenTool />,   category: "Imagens" as PageCategory },
  { title: "Comprimir Imagem",    path: "/compress",     icon: <ImageDown />, category: "Imagens" as PageCategory },
  { title: "Redimensionar Imagem",path: "/resize",       icon: <Scaling />,   category: "Imagens" as PageCategory },
  { title: "Converter Formato",   path: "/convert",      icon: <Repeat2 />,   category: "Imagens" as PageCategory },
  { title: "Extrator de Paleta",  path: "/palette",      icon: <Palette />,   category: "Imagens" as PageCategory },

  // Texto
  { title: "Reconhecer Texto",    path: "/ocr",          icon: <ScanText />,     category: "Texto" as PageCategory },
  { title: "Folha de Redação",    path: "/essay",        icon: <NotepadText />,  category: "Texto" as PageCategory },
  { title: "Folhas de Caligrafia",path: "/calligraphy",  icon: <Signature />,    category: "Texto" as PageCategory },
  { title: "Folhas Pautadas",     path: "/line-sheet",   icon: <NotebookPen />,  category: "Texto" as PageCategory },
  { title: "Comparar Textos",     path: "/diff",         icon: <GitCompare />,   category: "Texto" as PageCategory },

  // Produtividade
  { title: "Pomodoro",     path: "/pomodoro",     icon: <Timer />,         category: "Produtividade" as PageCategory },
  { title: "Teleprompter", path: "/teleprompter", icon: <SquareTerminal />,category: "Produtividade" as PageCategory },
  { title: "ZapLink",      path: "/zaplink",      icon: <AppWindow />,     category: "Produtividade" as PageCategory },

  // Utilidades
  { title: "QRCode",          path: "/qrcode",       icon: <QrCode />, category: "Utilidades" as PageCategory },
  { title: "Gerador de Senha",path: "/password",     icon: <Lock />,   category: "Utilidades" as PageCategory },
  { title: "Emoji",           path: "/emoji",        icon: <Smile />,  category: "Utilidades" as PageCategory },
  { title: "Nível Bolha",     path: "/bubble-level", icon: <Ruler />,  category: "Utilidades" as PageCategory },
  { title: "Webcam",          path: "/webcam",       icon: <Camera />, category: "Utilidades" as PageCategory },
  { title: "Estúdio de Ícone",path: "/icon",         icon: <Atom />,   category: "Utilidades" as PageCategory },

  // Diversão
  { title: "Aquário",         path: "/aquario",      icon: <Fish />,   category: "Diversão" as PageCategory },
];

export const PAGE_LIST = UNORDERED_LIST.sort((a, b) => a.title.localeCompare(b.title));

export const CATEGORY_ORDER: PageCategory[] = ["Imagens", "Texto", "Produtividade", "Utilidades", "Diversão"];
