import { renderToStaticMarkup } from "react-dom/server";
import type { LucideIcon } from "lucide-react";
import {
  Wifi, Link as LinkIcon, Phone, Mail, Instagram, MessageCircle, MapPin, Globe,
  ShoppingCart, Music, Camera, User, Facebook, X as XIcon, Youtube, Linkedin,
  Github, Twitch, Send, CreditCard, Calendar, Star, Heart, House,
} from "lucide-react";

export interface CenterIconOption {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const CENTER_ICONS: CenterIconOption[] = [
  { id: "wifi", label: "WiFi", Icon: Wifi },
  { id: "link", label: "Link", Icon: LinkIcon },
  { id: "phone", label: "Telefone", Icon: Phone },
  { id: "mail", label: "E-mail", Icon: Mail },
  { id: "instagram", label: "Instagram", Icon: Instagram },
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { id: "location", label: "Localização", Icon: MapPin },
  { id: "globe", label: "Site", Icon: Globe },
  { id: "cart", label: "Loja", Icon: ShoppingCart },
  { id: "music", label: "Música", Icon: Music },
  { id: "camera", label: "Câmera", Icon: Camera },
  { id: "user", label: "Perfil", Icon: User },
  { id: "facebook", label: "Facebook", Icon: Facebook },
  { id: "x", label: "X/Twitter", Icon: XIcon },
  { id: "youtube", label: "YouTube", Icon: Youtube },
  { id: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { id: "github", label: "GitHub", Icon: Github },
  { id: "twitch", label: "Twitch", Icon: Twitch },
  { id: "send", label: "Enviar", Icon: Send },
  { id: "card", label: "Pagamento", Icon: CreditCard },
  { id: "calendar", label: "Evento", Icon: Calendar },
  { id: "star", label: "Favorito", Icon: Star },
  { id: "heart", label: "Curtir", Icon: Heart },
  { id: "home", label: "Casa", Icon: House },
];

// Renders a lucide icon over a filled circle as a self-contained SVG data URI,
// suitable for qrcode.react's `imageSettings.src`.
export function iconToDataUri(Icon: LucideIcon, fgColor: string, bgColor: string): string {
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
      <circle cx={24} cy={24} r={24} fill={bgColor} />
      <g transform="translate(12, 12)">
        <Icon color={fgColor} size={24} strokeWidth={2} />
      </g>
    </svg>,
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
