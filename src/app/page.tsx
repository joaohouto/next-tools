"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useIsMobile } from "@/hooks/use-mobile";
import { useToolUsage } from "@/hooks/use-tool-usage";
import { getSortedByUsage, CATEGORY_ORDER } from "@/config/page-list";

import { BadgeRotateBorder } from "@/components/badge-rotate-border";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function Home() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { usage, trackUsage } = useToolUsage();

  const sortedList = getSortedByUsage(usage);

  return (
    <div className="max-w-[400px] min-h-screen flex flex-col justify-center items-center mx-auto p-8">
      <Image src="/icon.png" width={80} height={80} alt="tools" className="mb-4" />

      <h1 className="mb-8">
        <BadgeRotateBorder>tools</BadgeRotateBorder>
      </h1>

      <div className="w-full">
        <Command className="rounded-lg border shadow-md w-full">
          <CommandInput autoFocus={!isMobile} placeholder="Pesquisar..." />
          <CommandList>
            {CATEGORY_ORDER.map((category) => (
              <CommandGroup key={category} heading={category}>
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
            ))}

            <CommandEmpty>Nenhum resultado</CommandEmpty>
          </CommandList>
        </Command>
      </div>

      <div className="w-full">
        <a
          className="text-xs text-muted-foreground mt-8 flex items-center justify-center gap-2"
          href="https://github.com/joaohouto/next-tools"
        >
          github/joaohouto/next-tools
        </a>
      </div>
    </div>
  );
}
