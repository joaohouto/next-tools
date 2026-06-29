function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function accentFilter(value: string, search: string): number {
  return normalize(value).includes(normalize(search)) ? 1 : 0;
}
