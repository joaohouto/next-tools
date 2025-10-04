"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/use-debounce";
import { exportEssay } from "@/lib/export-image";
import { Download, Minus, Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

export default function Essay() {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [spellCheck, setSpellCheck] = useState(false);

  const debouncedText = useDebounce(text, 1000);
  const textRef = useRef<any>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const localText = localStorage.getItem("@Tools:Text");
    setText(localText || "");

    const localFont = localStorage.getItem("@Tools:FontSize");
    if (localFont) {
      setFontSize(JSON.parse(localFont));
    } else {
      setFontSize(16);
    }
  }, []);

  useEffect(() => {
    if (text != null) localStorage.setItem("@Tools:Text", text);
  }, [debouncedText]);

  useEffect(() => {
    localStorage.setItem("@Tools:FontSize", fontSize.toString());
  }, [fontSize]);

  const handleKeyDown = (event: any) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const { selectionStart, selectionEnd, value } = event.target;
      const newValue =
        value.substring(0, selectionStart) +
        "     " +
        value.substring(selectionEnd);
      setText(newValue);
    }
  };

  return (
    <div className="mx-auto p-8 gap-4 flex flex-col justify-center items-center">
      <nav className="w-[774px] flex flex-row-reverse gap-3 items-center">
        <Button
          variant="outline"
          size="icon"
          title="Baixar como .png"
          onClick={() =>
            exportEssay(
              textRef.current,
              `redacao-${dayjs().format("DD-MM-YYYY-HH-mm")}`
            )
          }
        >
          <Download size={14} />
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

        <div className="flex gap-2 items-center border rounded-md p-1 h-[36px]">
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6"
            title="Diminuir a fonte"
            onClick={() =>
              setFontSize((prev) => {
                if (prev > 12) {
                  return prev - 0.5;
                } else {
                  return prev;
                }
              })
            }
          >
            <Minus size={14} />
          </Button>
          <span className="text-sm text-foreground">{fontSize.toFixed(1)}</span>
          <Button
            size="icon"
            title="Aumentar a fonte"
            className="w-6 h-6"
            variant="ghost"
            onClick={() =>
              setFontSize((prev) => {
                if (prev < 20) {
                  return prev + 0.5;
                } else {
                  return prev;
                }
              })
            }
          >
            <Plus size={14} />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="spellcheck"
            checked={spellCheck}
            onCheckedChange={(value) => setSpellCheck(value)}
          />
          <Label htmlFor="spellcheck">Verificação ortográfica</Label>
        </div>
      </nav>

      <div
        ref={textRef}
        className="flex p-[30px] bg-background border rounded-2xl"
      >
        <textarea
          id="lineCounter"
          className="h-[930px] w-[32px] bg-neutral-100 text-neutral-300 dark:bg-neutral-900 dark:text-neutral-700 font-medium resize-none border-0 text-center text-outline mr-5 rounded text-[16px] leading-[31px] outline-none"
          defaultValue={`01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30`}
          readOnly={true}
        ></textarea>

        <textarea
          id="text"
          rows={30}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ fontSize: fontSize }}
          spellCheck={spellCheck}
          className="h-[930px] w-[660px] resize-none border-0 outline-none text-justify overflow-hidden text-neutral-900 dark:text-neutral-100 font-inter leading-[31px] bg-local
  bg-[linear-gradient(to_right,theme(colors.background)_0,transparent_0),linear-gradient(to_left,theme(colors.background)_0,transparent_0),repeating-linear-gradient(theme(colors.background),theme(colors.background)_30px,theme(colors.neutral.300)_30px,theme(colors.neutral.300)_31px,theme(colors.background)_31px)]
  dark:bg-[linear-gradient(to_right,theme(colors.background)_0,transparent_0),linear-gradient(to_left,theme(colors.background)_0,transparent_0),repeating-linear-gradient(theme(colors.background),theme(colors.background)_30px,theme(colors.neutral.600)_30px,theme(colors.neutral.600)_31px,theme(colors.background)_31px)]"
        ></textarea>
      </div>
    </div>
  );
}
