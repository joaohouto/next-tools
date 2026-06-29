import Client from "./client";

import type { Metadata } from "next";
import { PAGE_LIST } from "@/config/page-list";

const pageMeta = PAGE_LIST.filter((p) => p.path === "/ocr")[0];

export const metadata: Metadata = {
  title: pageMeta.title,
  description: pageMeta.description,
  openGraph: {
    title: pageMeta.title,
    description: pageMeta.description,
    images: [`/api/og?title=${encodeURIComponent(pageMeta.title)}`],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageMeta.title,
    description: pageMeta.description,
  },
};

export default function Page() {
  return <Client />;
}
