"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useIsMobile } from "@/hooks/use-mobile";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { getSortedByUsage, CATEGORY_ORDER } from "@/config/page-list";

import { BadgeRotateBorder } from "@/components/badge-rotate-border";
import { accentFilter } from "@/lib/search";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export default function Home() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { usage, trackUsage } = useToolUsage();

  const sortedList = getSortedByUsage(usage);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5">
      <div className="flex flex-col items-center gap-3">
        <Image src="/icon.png" width={64} height={64} alt="tools" />
        <BadgeRotateBorder>tools</BadgeRotateBorder>
      </div>

      <Command filter={accentFilter} className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
        <CommandInput autoFocus={!isMobile} placeholder="Pesquisar..." />
        <CommandList className="max-h-[65vh]">
          <CommandEmpty>Nenhum resultado</CommandEmpty>
          {CATEGORY_ORDER.map((category, i) => (
            <React.Fragment key={category}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={category}>
                {sortedList
                  .filter((p) => p.category === category)
                  .map((page) => (
                    <CommandItem
                      key={page.path}
                      onSelect={() => {
                        trackUsage(page.path);
                        router.push(page.path);
                      }}
                    >
                      {page.icon}
                      <span>{page.title}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </Command>

      <a
        className="text-xs text-muted-foreground opacity-40 hover:opacity-80 transition-opacity"
        href="https://github.com/joaohouto/next-tools"
      >
        github/joaohouto/next-tools
      </a>
    </div>
  );
}
