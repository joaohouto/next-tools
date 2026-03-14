"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { Monitor, Moon, Sun } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useTheme } from "next-themes";
import { PAGE_LIST } from "@/config/page-list";

const hotKeysOptions = {
  preventDefault: true,
  enableOnFormTags: true,
  enableOnContentEditable: true,
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const isSearching = query.trim().length > 0;

  useHotkeys("ctrl+k", () => setOpen((v) => !v), hotKeysOptions);

  useHotkeys(
    "ctrl+shift+l",
    () => setTheme(theme === "light" ? "dark" : "light"),
    hotKeysOptions,
  );

  useHotkeys("ctrl+shift+s", () => setTheme("system"), hotKeysOptions);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setQuery("");
  };

  const navigate = (path: string) => {
    router.push(path);
    handleOpenChange(false);
  };

  const THEME_COMMANDS = [
    {
      title: "Tema claro",
      icon: <Sun className="size-4" />,
      shortcut: "",
      onSelect: () => { setTheme("light"); handleOpenChange(false); },
    },
    {
      title: "Tema escuro",
      icon: <Moon className="size-4" />,
      shortcut: "",
      onSelect: () => { setTheme("dark"); handleOpenChange(false); },
    },
    {
      title: "Tema do sistema",
      icon: <Monitor className="size-4" />,
      shortcut: "",
      onSelect: () => { setTheme("system"); handleOpenChange(false); },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 gap-0 shadow-2xl max-w-xl">
        <Command shouldFilter={isSearching} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b px-3">
            <CommandInput
              placeholder="Pesquisar ferramentas..."
              value={query}
              onValueChange={setQuery}
              className="flex-1 border-0 focus:ring-0 h-12 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

            {!isSearching ? (
              /* ── Grid view ── */
              <div className="p-3">
                <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Ferramentas</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {PAGE_LIST.map((page) => (
                    <button
                      key={page.path}
                      onClick={() => navigate(page.path)}
                      className="flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                    >
                      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground [&>svg]:size-4">
                        {page.icon}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                        {page.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Filtered list view ── */
              <CommandGroup heading="Ferramentas">
                {PAGE_LIST.map((page) => (
                  <CommandItem
                    key={page.path}
                    value={page.title}
                    onSelect={() => navigate(page.path)}
                    className="gap-2"
                  >
                    <span className="flex size-6 items-center justify-center rounded bg-muted [&>svg]:size-4 shrink-0">
                      {page.icon}
                    </span>
                    <span>{page.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            <CommandGroup heading="Aparência">
              {THEME_COMMANDS.map((cmd) => (
                <CommandItem
                  key={cmd.title}
                  value={cmd.title}
                  onSelect={cmd.onSelect}
                  className="gap-2"
                >
                  {cmd.icon}
                  <span>{cmd.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="flex items-center gap-1"><Kbd>⏎</Kbd> abrir</span>
            <span className="flex items-center gap-1"><Kbd>Esc</Kbd> fechar</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
