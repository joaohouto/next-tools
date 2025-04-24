import {
  Atom,
  Github,
  Image,
  Key,
  Link,
  NotepadText,
  QrCode,
  ScanText,
  SquareTerminal,
  Timer,
  Workflow,
} from "lucide-react";

export const PAGE_LIST = [
  {
    title: "OCR",
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
    icon: <Key />,
  },

  {
    title: "Relógio Pomodoro",
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
    title: "Diagramas Mermaid",
    path: "/mermaid",
    icon: <Workflow />,
  },
  {
    title: "Teleprompter",
    path: "/teleprompter",
    icon: <SquareTerminal />,
  },

  {
    title: "GitHub",
    path: "https://github.com/joaohouto/next-tools",
    icon: <Github />,
  },
];
