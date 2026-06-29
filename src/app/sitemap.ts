import type { MetadataRoute } from "next";
import { UNORDERED_LIST } from "@/config/page-list";

const BASE = "https://tools.joaocouto.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, priority: 1, changeFrequency: "weekly" },
    ...UNORDERED_LIST.map((page) => ({
      url: `${BASE}${page.path}`,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
  ];
}
