import { Key, NotepadText, QrCode, Squirrel, Timer } from "lucide-react";

export const PAGE_LIST = [
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
    title: "Folha de Redação",
    path: "/essay",
    icon: <NotepadText />,
  },
  {
    title: "Relógio Pomodoro",
    path: "/pomodoro",
    icon: <Timer />,
  },
  {
    title: "Criador de Ícone",
    path: "/icon",
    icon: <Squirrel />,
  },
];
