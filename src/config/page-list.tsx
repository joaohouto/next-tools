import { Atom, Key, NotepadText, QrCode, Timer, Workflow } from "lucide-react";

export const PAGE_LIST = [
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
    title: "Gerador de QRCode",
    path: "/qrcode",
    icon: <QrCode />,
  },
  {
    title: "Gerador de Senha",
    path: "/password",
    icon: <Key />,
  },

  {
    title: "Gerador de Ícone",
    path: "/icon",
    icon: <Atom />,
  },
  {
    title: "Diagramas Mermaid",
    path: "/mermaid",
    icon: <Workflow />,
  },
];
