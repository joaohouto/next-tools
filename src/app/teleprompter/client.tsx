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

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();

      const text = event.clipboardData?.getData("text/plain"); // Pega apenas texto puro
      if (text && teleprompterRef.current) {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        selection.deleteFromDocument(); // Remove qualquer seleção ativa antes de colar

        const range = selection.getRangeAt(0);
        range.insertNode(document.createTextNode(text));

        range.collapse(false); // Move o cursor para o final do texto colado
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
        className="w-full h-full p-8 pb-[200px] box-border leading-[1.5] whitespace-pre-wrap overflow-y-auto outline-none"
        style={{
          fontSize: `${fontSize}px`,
          transform: isMirrored ? "scaleX(-1)" : "scaleX(1)",
        }}
      >
        Seu conteúdo aqui...
      </div>

      <nav className="max-w-full  overflow-x-auto flex gap-2 fixed bottom-5 left-1/2 -translate-x-1/2  p-2 rounded opacity-70">
        <Button size="icon" onClick={togglePlay} title="Play/Pause">
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button size="icon" onClick={toggleReverse} title="Inverter rolagem">
          {isReversed ? <CircleArrowUp /> : <CircleArrowDown />}
        </Button>

        <Button size="icon" onClick={toggleMirror} title="Inverter">
          <FlipHorizontal />
        </Button>
        <Button
          size="icon"
          onClick={() => adjustFontSize(4)}
          title="Aumentar fonte"
        >
          <AArrowUp />
        </Button>
        <Button
          size="icon"
          onClick={() => adjustFontSize(-4)}
          title="Diminuir fonte"
        >
          <AArrowDown />
        </Button>

        <Button
          size="icon"
          onClick={() => adjustSpeed(0.5)}
          title="Mais rápido"
        >
          <Rabbit />
        </Button>
        <Button
          size="icon"
          onClick={() => adjustSpeed(-0.5)}
          title="Mais lento"
        >
          <Turtle />
        </Button>
      </nav>
    </div>
  );
}
