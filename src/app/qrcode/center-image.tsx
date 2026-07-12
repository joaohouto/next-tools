import { forwardRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Icon as PhosphorIcon, IconProps } from "@phosphor-icons/react";
import type { IconWeight } from "@phosphor-icons/react";
import {
  WifiHigh, Link as LinkIcon, Phone, Envelope, InstagramLogo, WhatsappLogo, MapPin,
  ShoppingCart, MusicNote, Camera, User, FacebookLogo, XLogo, YoutubeLogo, LinkedinLogo,
  GithubLogo, TwitchLogo, PaperPlaneTilt, CreditCard, Calendar, Star, Heart, House,
} from "@phosphor-icons/react";

// Pix (Brazilian instant-payment system) brand mark — not part of Phosphor's generic
// icon set, so it's vendored here from Simple Icons (CC0 / public domain), matching
// Phosphor's Icon component shape so it drops into the same CENTER_ICONS list.
const PIX_PATH =
  "M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156";

const PixLogo: PhosphorIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", size = 24, weight: _weight, mirrored, alt, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      role={alt ? "img" : undefined}
      aria-label={alt}
      {...rest}
    >
      <path d={PIX_PATH} />
    </svg>
  ),
);
PixLogo.displayName = "PixLogo";

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
  { id: "pix", label: "PIX", Icon: PixLogo },
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
      <g transform="translate(6, 6)">
        <Icon color={fgColor} weight={weight} size={36} />
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
