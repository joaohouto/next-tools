"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useHotkeys } from "react-hotkeys-hook";

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

  const hotKeysOptions = {
    preventDefault: true,
    enableOnFormTags: true,
    enableOnContentEditable: true,
  };

  useHotkeys(
    "ctrl+k",
    () => {
      setOpen((open) => !open);
    },
    hotKeysOptions
  );

  useHotkeys(
    "ctrl+shift+l",
    () => {
      if (theme === "light") {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    },
    hotKeysOptions
  );

  const COMMAND_LIST = [
    {
      title: "Alternar tema da interface",
      shortcut: "L",
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
