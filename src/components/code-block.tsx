"use client";

import { ClipboardIcon } from "lucide-react";
import { Button } from "./ui/button";

export function CodeBlock({ title, code }: { title: string; code?: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(code || "");
  };

  return (
    <div className="mb-4 mt-6 pb-4 max-h-[650px] overflow-x-auto rounded-xl bg-neutral-950 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-4 border-b border-neutral-800 px-3.5 py-2">
        <span className="whitespace-nowrap text-sm font-medium font-mono text-neutral-400">
          {title}
        </span>

        <Button
          className="text-neutral-500 bg-transparent"
          size="icon"
          onClick={copy}
        >
          <ClipboardIcon />
        </Button>
      </div>
      <pre>
        <code className="relative rounded text-neutral-300 px-4 py-2 font-mono text-sm">
          {code}
        </code>
      </pre>
    </div>
  );
}
