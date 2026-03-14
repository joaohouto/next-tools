"use client";

import { useState } from "react";
import { IconRenderer, useIconPicker, EMOJI_CATEGORIES } from "@/hooks/use-icon-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { SmileIcon, GridIcon } from "lucide-react";
import type { IconSource } from "@/app/icon/types";
import { cn } from "@/lib/utils";

export const IconPickerInput = ({
  onChange,
  value,
}: {
  onChange: (value: IconSource) => void;
  value?: IconSource;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 h-10">
          {value ? (
            value.type === "lucide" ? (
              <>
                <IconRenderer className="size-4 shrink-0" icon={value.name} />
                <span className="truncate text-sm">{value.name}</span>
              </>
            ) : value.type === "emoji" ? (
              <>
                <span className="text-xl leading-none">{value.char}</span>
                <span className="truncate text-sm text-muted-foreground">Emoji</span>
              </>
            ) : (
              <>
                <GridIcon className="size-4 shrink-0" />
                <span className="text-sm">SVG Personalizado</span>
              </>
            )
          ) : (
            <span className="text-sm text-muted-foreground">Selecionar ícone</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Selecionar símbolo</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="lucide" className="w-full">
          <div className="px-5">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1 gap-1.5" value="lucide">
                <GridIcon className="size-3.5" />
                Ícones Lucide
              </TabsTrigger>
              <TabsTrigger className="flex-1 gap-1.5" value="emoji">
                <SmileIcon className="size-3.5" />
                Emoji
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="lucide" className="mt-0 px-5 pb-5">
            <LucideIconPicker
              onChange={(name) => {
                onChange({ type: "lucide", name });
                setOpen(false);
              }}
            />
          </TabsContent>
          <TabsContent value="emoji" className="mt-0 px-5 pb-5">
            <EmojiPicker
              onChange={(char) => {
                onChange({ type: "emoji", char });
                setOpen(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const LucideIconPicker = ({
  onChange,
}: {
  onChange: (name: string) => void;
}) => {
  const { search, setSearch, icons, iconCount } = useIconPicker();

  return (
    <div className="mt-3">
      <Input
        placeholder={`Pesquisar em ${iconCount} ícones...`}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="mb-3"
      />
      <ScrollArea className="h-[360px] pr-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-0.5">
          {icons.map(({ name, Component }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(name)}
                  className="flex items-center justify-center h-10 w-full rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Component className="!size-5 shrink-0" />
                  <span className="sr-only">{name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[120px] text-center">
                {name}
              </TooltipContent>
            </Tooltip>
          ))}
          {icons.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-10 text-sm text-muted-foreground">
              Nenhum ícone encontrado para &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </ScrollArea>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {icons.length < iconCount
          ? `${icons.length} resultados de ${iconCount} ícones`
          : `${iconCount} ícones disponíveis`}{" "}
        ·{" "}
        <a
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          lucide.dev
        </a>
      </p>
    </div>
  );
};

const EmojiPicker = ({ onChange }: { onChange: (char: string) => void }) => {
  const categories = Object.keys(EMOJI_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]);
  const [search, setSearch] = useState("");

  const displayEmojis = search
    ? Object.entries(EMOJI_CATEGORIES)
        .filter(([cat]) => cat.toLowerCase().includes(search.toLowerCase()))
        .flatMap(([, emojis]) => emojis)
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div className="mt-3">
      <Input
        placeholder="Filtrar categoria..."
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />
      {!search && (
        <div className="flex gap-1 flex-wrap mb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <ScrollArea className="h-[300px] pr-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-0.5">
          {displayEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              onClick={() => onChange(emoji)}
              title={emoji}
              className="flex items-center justify-center h-10 w-full text-2xl rounded-md hover:bg-accent transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </ScrollArea>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {search
          ? displayEmojis.length > 0
            ? `${displayEmojis.length} emoji em categorias correspondentes`
            : "Nenhuma categoria encontrada"
          : `Categoria: ${activeCategory}`}
      </p>
    </div>
  );
};

// Keep legacy export for any other consumers
export const IconPicker = ({
  onChange,
}: {
  onChange: (icon: string) => void;
}) => {
  const { search, setSearch, icons, iconCount } = useIconPicker();

  return (
    <div className="relative">
      <Input
        placeholder={`Pesquisar em ${iconCount} ícones...`}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ScrollArea className="mt-2 h-[400px] py-4">
        <div className="flex flex-wrap gap-2 pb-12">
          {icons.slice(0, 200).map(({ name, Component }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  role="button"
                  variant="ghost"
                  onClick={() => onChange(name)}
                  className="h-11"
                >
                  <Component className="!size-6 shrink-0" />
                  <span className="sr-only">{name}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{name}</TooltipContent>
            </Tooltip>
          ))}
          {icons.length === 0 && (
            <div className="flex grow flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">Nada encontrado...</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
