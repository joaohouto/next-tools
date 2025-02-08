"use client";

import { useState } from "react";
import { IconRenderer, useIconPicker } from "@/hooks/use-icon-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const IconPickerInput = ({
  onChange,
  defaultIcon,
}: {
  onChange: (icon: string) => void;
  defaultIcon?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<null | string>(defaultIcon || null);

  return (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-w-[150px]">
          {selected ? (
            <>
              <IconRenderer className="size-4" icon={selected} />
              Mudar ícone
            </>
          ) : (
            "Selecionar ícone"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar ícone</DialogTitle>
          <DialogDescription>
            Escolha o símbolo que melhor representa sua ideia
          </DialogDescription>
        </DialogHeader>
        <IconPicker
          onChange={(icon) => {
            setSelected(icon);
            onChange(icon);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

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
      <div className="mt-2 flex h-full max-h-[400px] flex-wrap gap-2 overflow-y-scroll py-4 pb-12">
        {icons.slice(0, 105).map(({ name, Component }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                key={name}
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
          <div className="col-span-full flex grow flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">Nada encontrado...</p>
          </div>
        )}
      </div>
    </div>
  );
};
