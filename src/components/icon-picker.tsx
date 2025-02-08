"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import * as LucideIcons from "lucide-react";
import React from "react";
import { FixedSizeGrid as Grid } from "react-window";

const COLUMN_COUNT = 5; // Número de colunas na grade
const ITEM_SIZE = 90; // Tamanho de cada célula da grade

export function IconPicker() {
  const icons = Object.entries(LucideIcons).filter(([name, Icon]) => {
    return React.isValidElement(Icon);
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Escolher ícone</Button>
      </DialogTrigger>

      <DialogContent className="w-full">
        <DialogHeader>
          <DialogTitle>Selecione um ícone</DialogTitle>
          <Input placeholder="Pesquisar..." />
        </DialogHeader>

        <Grid
          columnCount={COLUMN_COUNT}
          columnWidth={ITEM_SIZE}
          height={400}
          rowCount={Math.ceil(icons.length / COLUMN_COUNT)}
          rowHeight={ITEM_SIZE}
          width={COLUMN_COUNT * ITEM_SIZE}
        >
          {({ columnIndex, rowIndex, style }: any) => {
            const index = rowIndex * COLUMN_COUNT + columnIndex;
            if (index >= icons.length) return null;
            const [name, Icon] = icons[index];

            return (
              <button
                style={style}
                className="flex flex-col items-center justify-center gap-1 text-foreground p-2 rounded-md hover:bg-neutral-100 dark:bg-neutral-900"
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
