"use client";

import useSWR from "swr";
import { useEffect, useState, useRef } from "react";
import { SearchIcon, UploadIcon } from "lucide-react";

import { DailySaying } from "./sayings";
import { WeatherWidget } from "./weather-widget";

function Greeting() {
  const date = new Date();
  const hour = date.getHours();

  if (hour < 6) return <>Boa madrugada</>;
  if (hour < 12) return <>Bom dia</>;
  if (hour < 18) return <>Boa tarde</>;
  return <>Boa noite</>;
}

export default function Page() {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data, error } = useSWR("/api/wallpaper", fetcher);

  const [links, setLinks] =
    useState<{ url: string; title: string; favicon: string }[]>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("userLinks");
    if (saved) {
      setLinks(JSON.parse(saved));
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/html");
      const anchors = doc.querySelectorAll("a");

      const userLinks = Array.from(anchors).map((a) => ({
        url: a.href,
        title: a.textContent || a.href,
        favicon: `https://s2.googleusercontent.com/s2/favicons?domain=${a.href}&sz=32`,
      }));

      localStorage.setItem("userLinks", JSON.stringify(userLinks));
      setLinks(userLinks);
    };

    reader.readAsText(file);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between bg-cover bg-center text-white p-4"
      style={{
        backgroundImage: `url(${
          data?.imageUrl ||
          "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d"
        })`,
      }}
    >
      <header className="w-full flex gap-2 items-center justify-between">
        <WeatherWidget />
      </header>

      <section className="w-full md:w-[600px] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">
          <Greeting />,{" "}
          <span className="input" role="textbox" contentEditable>
            João
          </span>
          !
        </h1>

        <form
          action="https://www.google.com/search"
          method="GET"
          className="w-full relative"
        >
          <input
            className="w-full py-2 px-6 rounded-full bg-white/10 text-white backdrop-blur-lg"
            placeholder="Pesquisar na web"
            name="q"
            autoFocus
          />
          <SearchIcon className="absolute right-4 top-2.5 select-none size-5" />
        </form>

        <div className="flex items-center justify-center flex-wrap gap-2">
          {links?.map((link, index) => (
            <a
              key={index}
              href={link.url}
              className="size-[48px] bg-white/1 0 backdrop-blur-lg rounded-full flex flex-col items-center justify-center gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={link.favicon || "/icon.png"}
                alt={link.title}
                className="size-6"
              />
            </a>
          ))}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="size-[48px] bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center"
          >
            <UploadIcon size={20} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </section>

      <footer className="px-4 py-2 backdrop-blur-lg bg-white/10 rounded-xl">
        <span className="text-sm text-center opacity-50 text-white">
          <DailySaying />
        </span>
      </footer>
    </div>
  );
}
