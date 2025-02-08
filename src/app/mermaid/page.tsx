"use client";

import { useRef, useState } from "react";
import { CopyIcon, DownloadIcon, Package } from "lucide-react";
import { copyImage, exportAsImage } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import Mermaid from "@/components/mermaid-render";
import dayjs from "dayjs";

import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Spinner } from "@/components/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { CodeBlock } from "@/components/code-block";

const EXAMPLES = [
  {
    name: "Basic Pie Chart",
    code: `pie title NETFLIX
        "Time spent looking for movie" : 90
        "Time spent watching it" : 10`,
  },
  {
    name: "Basic Flowchart",
    code: `graph LR
    A[Square Rect] -- Link text --> B((Circle))
    A --> C(Round Rect)
    B --> D{Rhombus}
    C --> D`,
  },
];

export default function Page() {
  const [text, setText] = useState(EXAMPLES[1]?.code || "");

  const imageRef = useRef(null);

  const { theme } = useTheme();

  return (
    <div className="w-screen h-screen p-4 grid grid-rows-2 gap-6 lg:grid-cols-2 lg:grid-rows-1">
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

      <div className="h-full rounded-md border flex flex-col items-center justify-between bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px]">
        <div className="h-full w-full overflow-auto flex items-center justify-center">
          <Mermaid chart={text} id="mermaid" ref={imageRef} />
        </div>

        <nav className="flex flex-row-reverse items-center gap-2 p-4 w-full">
          <Button
            onClick={() =>
              exportAsImage(
                imageRef.current,
                `mermaid-${dayjs().format("DD-MM-YYYY-HH-mm")}`,
                {
                  pixelRatio: 2,
                }
              )
            }
          >
            <DownloadIcon /> Download
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              copyImage(imageRef.current, {
                pixelRatio: 2,
              })
            }
          >
            <CopyIcon /> Copiar
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Package />
                Exemplos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <AlertDialogHeader>
                <DialogTitle>Exemplos de Código</DialogTitle>
                <DialogDescription>
                  Copie, cole e altere de acordo com suas necessidades.
                </DialogDescription>
              </AlertDialogHeader>

              <div>
                {EXAMPLES?.map((example) => (
                  <CodeBlock title={example?.name || ""} code={example?.code} />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </nav>
      </div>
    </div>
  );
}
