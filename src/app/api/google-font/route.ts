const FAMILY_RE = /^[A-Za-z0-9 ]{1,60}$/;
const WEIGHT_RE = /^[1-9]00$/;

async function fetchFontBuffer(family: string, weight: string) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  )}:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl);
  if (!cssRes.ok) return null;
  const css = await cssRes.text();

  // Prefer the "latin" subset block: it covers U+0000-00FF (Latin-1 Supplement),
  // which includes the accented characters used in Portuguese (ã, ç, õ, é...).
  // The "latin-ext" block Google lists first only covers rarer extended Latin
  // characters and is missing those glyphs.
  const latinBlock = css.match(/\/\* latin \*\/\s*@font-face\s*{[^}]*}/);
  const block = latinBlock ? latinBlock[0] : css;

  const resource = block.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
  );
  if (!resource) return null;

  const fontRes = await fetch(resource[1]);
  if (!fontRes.ok) return null;

  return {
    buffer: await fontRes.arrayBuffer(),
    format: resource[2] as "opentype" | "truetype",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const family = searchParams.get("family") ?? "";
  const weight = searchParams.get("weight") ?? "400";

  if (!FAMILY_RE.test(family) || !WEIGHT_RE.test(weight)) {
    return new Response("Invalid family or weight", { status: 400 });
  }

  try {
    const font = await fetchFontBuffer(family, weight);
    if (!font) {
      return new Response("Font not found", { status: 404 });
    }

    return new Response(font.buffer, {
      headers: {
        "Content-Type": font.format === "opentype" ? "font/otf" : "font/ttf",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("Erro ao buscar fonte do Google Fonts:", e);
    return new Response("Failed to load font", { status: 500 });
  }
}
