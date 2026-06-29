import type { Metadata } from "next";
import { PAGE_LIST } from "@/config/page-list";
import Client from "./client";

const pageMeta = PAGE_LIST.find((p) => p.path === "/calligraphy")!;

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
