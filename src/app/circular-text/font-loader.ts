import * as opentype from "opentype.js";

const cache = new Map<string, Promise<opentype.Font>>();

export function loadFont(family: string, weight: number): Promise<opentype.Font> {
  const key = `${family}:${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = fetch(
    `/api/google-font?family=${encodeURIComponent(family)}&weight=${weight}`,
  )
    .then((res) => {
      if (!res.ok) throw new Error(`Falha ao carregar a fonte ${family}`);
      return res.arrayBuffer();
    })
    .then((buffer) => opentype.parse(buffer));

  // Don't cache a failed load — lets a later retry (e.g. after reconnecting) succeed.
  promise.catch(() => cache.delete(key));

  cache.set(key, promise);
  return promise;
}
