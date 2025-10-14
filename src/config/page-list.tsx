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
} from "lucide-react";

export const UNORDERED_LIST = [
  {
    title: "Reconhecer Texto (OCR)",
    path: "/ocr",
    icon: <ScanText />,
  },
  {
    title: "QRCode",
    path: "/qrcode",
    icon: <QrCode />,
  },

  {
    title: "Gerador de Senha",
    path: "/password",
    icon: <Lock />,
  },

  {
    title: "Emoji",
    path: "/emoji",
    icon: <Smile />,
  },

  {
    title: "Nível Bolha",
    path: "/bubble-level",
    icon: <Ruler />,
  },

  {
    title: "Pomodoro",
    path: "/pomodoro",
    icon: <Timer />,
  },

  {
    title: "Folha de Redação",
    path: "/essay",
    icon: <NotepadText />,
  },

  {
    title: "Estúdio de Ícone",
    path: "/icon",
    icon: <Atom />,
  },

  {
    title: "Teleprompter",
    path: "/teleprompter",
    icon: <SquareTerminal />,
  },
  {
    title: "Webcam",
    path: "/webcam",
    icon: <Camera />,
  },
  {
    title: "Removedor de Cor",
    path: "/color-remover",
    icon: <Eraser />,
  },
  {
    title: "Removedor de Fundo",
    path: "/background-remover",
    icon: <BookImage />,
  },
];

export const PAGE_LIST = UNORDERED_LIST.sort((a, b) =>
  a.title.localeCompare(b.title)
);
