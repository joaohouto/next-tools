"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Command } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useTheme } from "next-themes";
import { PAGE_LIST } from "@/config/page-list";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);

  const router = useRouter();
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const COMMAND_LIST = [
    {
      title: "Alternar tema da interface",
      onSelect: () => {
        if (theme === "light") {
          setTheme("dark");
        } else {
          setTheme("light");
        }
      },
    },
    {
      title: "Aplicar tema de cores do dispositivo",
      onSelect: () => {
        setTheme("system");
      },
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar..." />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {PAGE_LIST.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => {
                router.push(page.path);
                setOpen(false);
              }}
            >
              {page.icon}
              <span>{page.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Comandos">
          {COMMAND_LIST.map((command) => (
            <CommandItem key={command.title} onSelect={command.onSelect}>
              <Command />
              <span>{command.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
