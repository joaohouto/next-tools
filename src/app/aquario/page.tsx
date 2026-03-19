import Client from "./client";

export const metadata = {
  title: "Aquário",
  openGraph: {
    images: [`/api/og?title=Aquário`],
  },
};

export default function Page() {
  return <Client />;
}
