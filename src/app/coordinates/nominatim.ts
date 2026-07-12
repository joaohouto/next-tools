import type { NominatimResult } from "./types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export class NominatimRateLimitError extends Error {
  constructor() {
    super("Muitas buscas em pouco tempo. Aguarde um instante e tente novamente.");
    this.name = "NominatimRateLimitError";
  }
}

// Wrapper client-side para a API pública do Nominatim (OpenStreetMap), sem
// chave de API. O fetch do navegador não permite customizar o header
// User-Agent — dependemos do Referer enviado automaticamente. Uso leve,
// dentro da política de uso do Nominatim (operations.osmfoundation.org/policies/nominatim).
const searchCache = new Map<string, NominatimResult[]>();

async function nominatimFetch(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = new URL(`${NOMINATIM_BASE_URL}${path}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString(), { signal });
  if (res.status === 429) throw new NominatimRateLimitError();
  if (!res.ok) throw new Error(`Nominatim respondeu com status ${res.status}`);
  return res.json();
}

export async function geocode(query: string, signal?: AbortSignal): Promise<NominatimResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const cached = searchCache.get(normalized);
  if (cached) return cached;

  const results = (await nominatimFetch("/search", { q: query, limit: "5" }, signal)) as NominatimResult[];
  searchCache.set(normalized, results);
  return results;
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<NominatimResult | null> {
  const result = (await nominatimFetch("/reverse", { lat: String(lat), lon: String(lng) }, signal)) as
    | (NominatimResult & { error?: string })
    | null;
  if (!result || result.error) return null;
  return result;
}
