import Client from "./client";

import { PAGE_LIST } from "@/config/page-list";

const pageMeta = PAGE_LIST.filter((p) => p.path === "/vectorizer")[0];

export const metadata = {
  title: pageMeta.title,
  openGraph: {
    images: [`/api/og?title=${pageMeta.title}`],
  },
};

export default function Page() {
  return <Client />;
}
