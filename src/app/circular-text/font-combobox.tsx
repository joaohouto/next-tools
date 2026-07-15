"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FONTS, FONT_CATEGORIES } from "./fonts";

interface FontComboboxProps {
  value: string;
  onChange: (family: string) => void;
}

export function FontCombobox({ value, onChange }: FontComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span style={{ fontFamily: value }} className="truncate">
            {value}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar fonte..." />
          <CommandList>
            <CommandEmpty>Nenhuma fonte encontrada.</CommandEmpty>
            {FONT_CATEGORIES.map((category) => (
              <CommandGroup key={category} heading={category}>
                {FONTS.filter((f) => f.category === category).map((f) => (
                  <CommandItem
                    key={f.family}
                    value={f.family}
                    onSelect={() => {
                      onChange(f.family);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === f.family ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span style={{ fontFamily: f.family }}>{f.family}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
