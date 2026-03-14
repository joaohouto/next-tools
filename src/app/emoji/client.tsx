"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import emojiList from "./emoji-list.json";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, Smile } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function EmojiSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmojis, setFilteredEmojis] = useState(emojiList);

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (!lowerCaseSearchTerm) {
      setFilteredEmojis(emojiList);
      return;
    }

    setFilteredEmojis(
      emojiList.filter(
        (emoji: any) =>
          emoji.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          (emoji.keywords &&
            emoji.keywords.some((keyword: any) =>
              keyword.toLowerCase().includes(lowerCaseSearchTerm)
            ))
      )
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 px-4 py-6">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <PageHeader
          title="Emoji"
          description="Pesquise e copie emojis."
          icon={<Smile className="w-5 h-5" />}
        />
      <div className="relative">
        <Search className="absolute text-muted-foreground left-2.5 top-2.5 size-4" />

        <Input
          type="text"
          placeholder="Pesquisar..."
          className="mb-8 pl-10"
          autoFocus
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-center flex-wrap gap-2">
        {filteredEmojis.map((emoji) => (
          <Button
            key={emoji.name}
            className="text-3xl text-center size-16"
            onClick={() => {
              navigator.clipboard.writeText(emoji.emoji);

              toast.success(`${emoji.emoji} copiado!`);
            }}
            size="icon"
            variant="ghost"
            title={emoji.name}
          >
            {emoji.emoji}
          </Button>
        ))}

        {filteredEmojis.length === 0 && (
          <span className="text-muted-foreground text-sm">
            Nenhum emoji encontrado!
          </span>
        )}
      </div>
    </div>
    </div>
  );
}
