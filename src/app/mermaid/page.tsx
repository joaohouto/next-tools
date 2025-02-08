"use client";

import { useRef, useState } from "react";
import { CopyIcon, DownloadIcon, Moon, Sun } from "lucide-react";
import { copyImage, exportAsImage } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Mermaid from "@/components/mermaid-render";
import dayjs from "dayjs";

import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Spinner } from "@/components/spinner";

export default function Page() {
  const [text, setText] = useState(`graph LR;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
`);

  const imageRef = useRef(null);

  const { theme, setTheme } = useTheme();

  return (
    <div className="w-screen h-screen p-4 gap-4 flex flex-col overflow-hidden">
      <div className="grid h-[calc(100vh-36px-48px)] grid-rows-2 gap-6 lg:grid-cols-2 lg:grid-rows-1">
        <div className="rounded-md border">
          <Editor
            defaultLanguage="mermaid"
            theme={theme === "dark" ? "vs-dark" : "light"}
            defaultValue={text}
            onChange={(value) => setText(value || "")}
            options={{
              minimap: {
                enabled: false,
              },
            }}
            loading={<Spinner />}
          />
        </div>

        <div className="h-full rounded-md border flex items-center justify-center overflow-auto">
          <Mermaid chart={text} id="mermaid" ref={imageRef} />
        </div>
      </div>

      <nav className="flex flex-row-reverse items-center gap-2">
        <Button variant="outline" onClick={() => copyImage(imageRef.current)}>
          <CopyIcon /> Copiar
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            exportAsImage(
              imageRef.current,
              `mermaid-${dayjs().format("DD-MM-YYYY-HH-mm")}`
            )
          }
        >
          <DownloadIcon /> Download
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (theme === "light") {
              setTheme("dark");
            } else {
              setTheme("light");
            }
          }}
          title="Alternar tema"
          className="btn"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
      </nav>
    </div>
  );
}
