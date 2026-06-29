"use client";

import { Button } from "@/components/ui/button";
import {
  AArrowDown,
  AArrowUp,
  CircleArrowDown,
  CircleArrowUp,
  FlipHorizontal,
  Pause,
  Play,
  Rabbit,
  Turtle,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Teleprompter() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isReversed, setIsReversed] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [fontSize, setFontSize] = useState(48);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
      scrollInterval.current = setInterval(() => {
        if (teleprompterRef.current) {
          const direction = isReversed ? -1 : 1;
          teleprompterRef.current.scrollTop += scrollSpeed * direction;
        }
      }, 50);
    } else {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
        scrollInterval.current = null;
      }
    }
    return () => {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    };
  }, [isPlaying, scrollSpeed, isReversed]);

  function togglePlay() {
    setIsPlaying((prev) => !prev);
  }

  function toggleReverse() {
    setIsReversed((prev) => !prev);
  }

  function adjustSpeed(delta: number) {
    setScrollSpeed((prev) => Math.max(0.2, Math.min(10, prev + delta)));
  }

  function toggleMirror() {
    setIsMirrored((prev) => !prev);
  }

  function adjustFontSize(delta: number) {
    setFontSize((prev) => Math.max(12, Math.min(96, prev + delta)));
  }

  function resetScroll() {
    if (!teleprompterRef.current) return;
    teleprompterRef.current.scrollTop = isReversed
      ? teleprompterRef.current.scrollHeight
      : 0;
  }

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();

      const text = event.clipboardData?.getData("text/plain");
      if (text && teleprompterRef.current) {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        selection.deleteFromDocument();

        const range = selection.getRangeAt(0);
        range.insertNode(document.createTextNode(text));

        range.collapse(false);
      }
    };

    const element = teleprompterRef.current;
    if (element) {
      element.addEventListener("paste", handlePaste);
    }

    return () => {
      if (element) {
        element.removeEventListener("paste", handlePaste);
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col h-screen">
      <div
        ref={teleprompterRef}
        contentEditable
        suppressContentEditableWarning
        className="w-full h-full p-8 pb-[160px] box-border leading-[1.5] whitespace-pre-wrap overflow-y-auto outline-none"
        style={{
          fontSize: `${fontSize}px`,
          transform: isMirrored ? "scaleX(-1)" : "scaleX(1)",
        }}
      >
        Seu conteúdo aqui...
      </div>

      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 rounded-2xl backdrop-blur-md bg-background/80 border shadow-lg">
        <Button
          size="icon"
          variant={isPlaying ? "default" : "ghost"}
          onClick={togglePlay}
          title="Play/Pause"
          className="rounded-xl"
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={resetScroll}
          title="Voltar ao início"
          className="rounded-xl"
        >
          <RotateCcw size={16} />
        </Button>

        <Button
          size="icon"
          variant={isReversed ? "secondary" : "ghost"}
          onClick={toggleReverse}
          title="Inverter rolagem"
          className="rounded-xl"
        >
          {isReversed ? <CircleArrowUp /> : <CircleArrowDown />}
        </Button>

        <Button
          size="icon"
          variant={isMirrored ? "secondary" : "ghost"}
          onClick={toggleMirror}
          title="Espelhar"
          className="rounded-xl"
        >
          <FlipHorizontal />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => adjustFontSize(-4)}
          title="Diminuir fonte"
          className="rounded-xl"
        >
          <AArrowDown />
        </Button>
        <span className="text-xs text-muted-foreground font-mono w-10 text-center tabular-nums">
          {fontSize}px
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => adjustFontSize(4)}
          title="Aumentar fonte"
          className="rounded-xl"
        >
          <AArrowUp />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => adjustSpeed(-0.5)}
          title="Mais lento"
          className="rounded-xl"
        >
          <Turtle />
        </Button>
        <span className="text-xs text-muted-foreground font-mono w-10 text-center tabular-nums">
          {scrollSpeed.toFixed(1)}x
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => adjustSpeed(0.5)}
          title="Mais rápido"
          className="rounded-xl"
        >
          <Rabbit />
        </Button>
      </nav>
    </div>
  );
}
