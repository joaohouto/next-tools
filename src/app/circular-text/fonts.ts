import type { FontOption } from "./types";

const W_FULL = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const W_WIDE = [300, 400, 500, 600, 700, 800];

export const FONTS: FontOption[] = [
  // Sans-serif
  { family: "Inter", category: "Sans", weights: W_FULL },
  { family: "Roboto", category: "Sans", weights: [100, 300, 400, 500, 700, 900] },
  { family: "Open Sans", category: "Sans", weights: W_WIDE },
  { family: "Lato", category: "Sans", weights: [100, 300, 400, 700, 900] },
  { family: "Montserrat", category: "Sans", weights: W_FULL },
  { family: "Poppins", category: "Sans", weights: W_FULL },
  { family: "Nunito", category: "Sans", weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: "Work Sans", category: "Sans", weights: W_FULL },
  { family: "Rubik", category: "Sans", weights: W_WIDE.concat(900) },
  { family: "DM Sans", category: "Sans", weights: W_FULL },
  { family: "Manrope", category: "Sans", weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: "Outfit", category: "Sans", weights: W_FULL },
  { family: "Sora", category: "Sans", weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { family: "Plus Jakarta Sans", category: "Sans", weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: "Space Grotesk", category: "Sans", weights: [300, 400, 500, 600, 700] },
  { family: "Urbanist", category: "Sans", weights: W_FULL },
  { family: "Barlow", category: "Sans", weights: W_FULL },
  { family: "Karla", category: "Sans", weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: "Figtree", category: "Sans", weights: W_WIDE.concat(900) },
  { family: "Mulish", category: "Sans", weights: [200, 300, 400, 500, 600, 700, 800, 900] },

  // Serif
  { family: "Playfair Display", category: "Serif", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Merriweather", category: "Serif", weights: [300, 400, 700, 900] },
  { family: "Lora", category: "Serif", weights: [400, 500, 600, 700] },
  { family: "PT Serif", category: "Serif", weights: [400, 700] },
  { family: "Source Serif 4", category: "Serif", weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: "Cormorant Garamond", category: "Serif", weights: [300, 400, 500, 600, 700] },
  { family: "Libre Baskerville", category: "Serif", weights: [400, 700] },
  { family: "Crimson Text", category: "Serif", weights: [400, 600, 700] },
  { family: "EB Garamond", category: "Serif", weights: [400, 500, 600, 700, 800] },
  { family: "Bitter", category: "Serif", weights: W_FULL },

  // Display / decorative
  { family: "Bebas Neue", category: "Display", weights: [400] },
  { family: "Anton", category: "Display", weights: [400] },
  { family: "Oswald", category: "Display", weights: [200, 300, 400, 500, 600, 700] },
  { family: "Archivo Black", category: "Display", weights: [400] },
  { family: "Fjalla One", category: "Display", weights: [400] },
  { family: "Righteous", category: "Display", weights: [400] },
  { family: "Passion One", category: "Display", weights: [400, 700, 900] },
  { family: "Alfa Slab One", category: "Display", weights: [400] },
  { family: "Bungee", category: "Display", weights: [400] },
  { family: "Monoton", category: "Display", weights: [400] },
  { family: "Lobster", category: "Display", weights: [400] },

  // Handwriting / script
  { family: "Pacifico", category: "Script", weights: [400] },
  { family: "Caveat", category: "Script", weights: [400, 500, 600, 700] },
  { family: "Dancing Script", category: "Script", weights: [400, 500, 600, 700] },
  { family: "Great Vibes", category: "Script", weights: [400] },
  { family: "Satisfy", category: "Script", weights: [400] },
  { family: "Sacramento", category: "Script", weights: [400] },
  { family: "Kalam", category: "Script", weights: [300, 400, 700] },
  { family: "Shadows Into Light", category: "Script", weights: [400] },
  { family: "Permanent Marker", category: "Script", weights: [400] },
  { family: "Amatic SC", category: "Script", weights: [400, 700] },
  { family: "Parisienne", category: "Script", weights: [400] },
  { family: "Italianno", category: "Script", weights: [400] },
  { family: "Alex Brush", category: "Script", weights: [400] },

  // Monospace
  { family: "Roboto Mono", category: "Mono", weights: [100, 200, 300, 400, 500, 600, 700] },
  { family: "JetBrains Mono", category: "Mono", weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { family: "Space Mono", category: "Mono", weights: [400, 700] },
  { family: "IBM Plex Mono", category: "Mono", weights: [100, 200, 300, 400, 500, 600, 700] },
  { family: "Fira Code", category: "Mono", weights: [300, 400, 500, 600, 700] },
  { family: "Source Code Pro", category: "Mono", weights: [200, 300, 400, 500, 600, 700, 800, 900] },
];

export const FONT_CATEGORIES: FontOption["category"][] = [
  "Sans",
  "Serif",
  "Display",
  "Script",
  "Mono",
];

export function getFont(family: string): FontOption {
  return FONTS.find((f) => f.family === family) ?? FONTS[0];
}
