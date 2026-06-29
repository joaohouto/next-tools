import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { CommandMenu } from "@/components/command-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.joaocouto.com"),
  title: {
    default: "tools",
    template: "%s | tools",
  },
  description:
    "Ferramentas úteis para o dia a dia — direto no navegador, sem instalação.",
  openGraph: {
    title: "tools",
    description:
      "Ferramentas úteis para o dia a dia — direto no navegador, sem instalação.",
    images: ["/api/og?title=tools"],
    type: "website",
    siteName: "tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "tools",
    description:
      "Ferramentas úteis para o dia a dia — direto no navegador, sem instalação.",
    images: ["/api/og?title=tools"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-mono`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <CommandMenu />
            <Toaster
              position="bottom-center"
              richColors
              className="font-mono"
            />
          </TooltipProvider>
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  );
}
