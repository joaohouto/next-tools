import { PAGE_LIST } from "@/config/page-list";
import Client from "./client";

const pageMeta = PAGE_LIST.find((p) => p.path === "/imagem")!;

export const metadata = {
  title: pageMeta.title,
  openGraph: { images: [`/api/og?title=${pageMeta.title}`] },
};

export default function Page() {
  return <Client />;
}
