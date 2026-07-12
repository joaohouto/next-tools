import { renderToStaticMarkup } from "react-dom/server";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import {
  WifiHigh, Link as LinkIcon, Phone, Envelope, InstagramLogo, WhatsappLogo, MapPin, Globe,
  ShoppingCart, MusicNote, Camera, User, FacebookLogo, XLogo, YoutubeLogo, LinkedinLogo,
  GithubLogo, TwitchLogo, PaperPlaneTilt, CreditCard, Calendar, Star, Heart, House,
} from "@phosphor-icons/react";

export interface CenterIconOption {
  id: string;
  label: string;
  Icon: PhosphorIcon;
}

export const CENTER_ICONS: CenterIconOption[] = [
  { id: "wifi", label: "WiFi", Icon: WifiHigh },
  { id: "link", label: "Link", Icon: LinkIcon },
  { id: "phone", label: "Telefone", Icon: Phone },
  { id: "mail", label: "E-mail", Icon: Envelope },
  { id: "instagram", label: "Instagram", Icon: InstagramLogo },
  { id: "whatsapp", label: "WhatsApp", Icon: WhatsappLogo },
  { id: "location", label: "Localização", Icon: MapPin },
  { id: "globe", label: "Site", Icon: Globe },
  { id: "cart", label: "Loja", Icon: ShoppingCart },
  { id: "music", label: "Música", Icon: MusicNote },
  { id: "camera", label: "Câmera", Icon: Camera },
  { id: "user", label: "Perfil", Icon: User },
  { id: "facebook", label: "Facebook", Icon: FacebookLogo },
  { id: "x", label: "X/Twitter", Icon: XLogo },
  { id: "youtube", label: "YouTube", Icon: YoutubeLogo },
  { id: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { id: "github", label: "GitHub", Icon: GithubLogo },
  { id: "twitch", label: "Twitch", Icon: TwitchLogo },
  { id: "send", label: "Enviar", Icon: PaperPlaneTilt },
  { id: "card", label: "Pagamento", Icon: CreditCard },
  { id: "calendar", label: "Evento", Icon: Calendar },
  { id: "star", label: "Favorito", Icon: Star },
  { id: "heart", label: "Curtir", Icon: Heart },
  { id: "home", label: "Casa", Icon: House },
];

export const ICON_WEIGHTS: { value: IconWeight; label: string }[] = [
  { value: "regular", label: "Outline" },
  { value: "bold", label: "Bold" },
  { value: "fill", label: "Solid" },
  { value: "duotone", label: "Duotone" },
];

// Renders a Phosphor icon over a filled circle as a self-contained SVG data URI,
// suitable for qrcode.react's `imageSettings.src`. The SVG is vector, so it scales
// cleanly regardless of the requested QR center-image size.
export function iconToDataUri(Icon: PhosphorIcon, weight: IconWeight, fgColor: string, bgColor: string): string {
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
      <circle cx={24} cy={24} r={24} fill={bgColor} />
      <g transform="translate(12, 12)">
        <Icon color={fgColor} weight={weight} size={24} />
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
