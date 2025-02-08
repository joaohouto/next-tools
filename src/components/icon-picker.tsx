"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/debounce";

import { Atom, icons as LucideIcons } from "lucide-react";
import React, { useEffect, useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";

const COLUMN_COUNT = 5;
const ITEM_SIZE = 90;

export function IconPicker({
  onChangeIcon,
}: {
  onChangeIcon: (icon: any) => any;
}) {
  const icons = Object.entries(LucideIcons);

  const [open, setOpen] = useState(false);
  const [filteredIcons, setFilteredIcons] = useState(icons);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const filtered = icons.filter(([name]) =>
      name.toLocaleLowerCase().includes(debouncedQuery.toLocaleLowerCase())
    );
    setFilteredIcons(filtered);
  }, [debouncedQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Atom />
        Escolher ícone
      </Button>

      <DialogContent className="w-full">
        <DialogHeader className="space-y-4">
          <DialogTitle>Selecione um ícone</DialogTitle>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar..."
          />
        </DialogHeader>

        <Grid
          columnCount={COLUMN_COUNT}
          columnWidth={ITEM_SIZE}
          height={400}
          rowCount={Math.ceil(filteredIcons.length / COLUMN_COUNT)}
          rowHeight={ITEM_SIZE}
          width={COLUMN_COUNT * ITEM_SIZE + 20}
        >
          {({ columnIndex, rowIndex, style }: any) => {
            const index = rowIndex * COLUMN_COUNT + columnIndex;
            if (index >= filteredIcons.length) return null;
            const [name, Icon] = filteredIcons[index];

            return (
              <button
                onClick={() => {
                  onChangeIcon(Icon);
                  setOpen(false);
                }}
                style={style}
                className="flex flex-col items-center justify-center gap-1 text-foreground p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <Icon size={32} />
                <span className="text-xs w-full truncate">{name}</span>
              </button>
            );
          }}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
