"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import emojiList from "@/lib/emoji-list.json";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
    <div className="px-4 py-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Emoji</h1>
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
      </div>
    </div>
  );
}
