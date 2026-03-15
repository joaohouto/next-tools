import Client from "./client";
import { PAGE_LIST } from "@/config/page-list";

const pageMeta = PAGE_LIST.find((p) => p.path === "/palette")!;

export const metadata = {
  title: pageMeta.title,
  openGraph: { images: [`/api/og?title=${pageMeta.title}`] },
};

export default function Page() {
  return <Client />;
}
