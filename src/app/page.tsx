"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useIsMobile } from "@/hooks/use-mobile";
import { PAGE_LIST, CATEGORY_ORDER } from "@/config/page-list";

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
                {PAGE_LIST.filter((p) => p.category === category).map((page) => (
                  <CommandItem
                    key={page.path}
                    onSelect={() => router.push(page.path)}
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
