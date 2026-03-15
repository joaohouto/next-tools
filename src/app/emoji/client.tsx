"use client";

import { useEffect, useRef, useState } from "react";
import emojiList from "./emoji-list.json";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

type Emoji = { name: string; emoji: string; keywords?: string[] };

export default function EmojiSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtered, setFiltered] = useState<Emoji[]>(emojiList);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFiltered(emojiList);
      return;
    }
    setFiltered(
      emojiList.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.keywords?.some((k) => k.toLowerCase().includes(term))
      )
    );
  }, [searchTerm]);

  const copyEmoji = (emoji: Emoji) => {
    navigator.clipboard.writeText(emoji.emoji);
    setCopied(emoji.emoji);
    toast.success(`${emoji.emoji} copiado!`);
    setTimeout(() => setCopied(null), 1200);
  };

  const clearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const friendlyName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pt-8 gap-6">

      {/* Search bar */}
      <div className="w-full max-w-sm sticky top-4 z-10 backdrop-blur-md bg-background/60 rounded-2xl p-2 border border-border/50 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Pesquisar emoji..."
            className="pl-9 pr-9 h-11 rounded-xl bg-transparent border-0 shadow-none focus-visible:ring-0"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {filtered.length === 0
              ? "Nenhum emoji encontrado"
              : `${filtered.length} emoji${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`
            }
          </p>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1">
            {filtered.map((emoji) => (
              <button
                key={emoji.name}
                onClick={() => copyEmoji(emoji)}
                title={friendlyName(emoji.name)}
                className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-xl p-2 transition-all active:scale-90 ${
                  copied === emoji.emoji
                    ? "bg-primary/10 scale-95"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-3xl leading-none select-none">{emoji.emoji}</span>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center opacity-0 group-hover:opacity-100 transition-opacity leading-tight mt-0.5">
                  {friendlyName(emoji.name)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <span className="text-5xl">🤔</span>
          <p className="text-sm">Nenhum emoji encontrado para "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
