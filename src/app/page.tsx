"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { useIsMobile } from "@/hooks/use-mobile";
import { PAGE_LIST } from "@/config/page-list";

import { BadgeRotateBorder } from "@/components/badge-rotate-border";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const itemVariants = {
  hidden: { y: 20, opacity: 0, filter: "blur(6px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0)",
    transition: {
      duration: 0.4,
      delay: index * 0.2,
    },
  }),
};

export default function Home() {
  const router = useRouter();

  const isMobile = useIsMobile();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="max-w-[400px] min-h-screen flex flex-col justify-center items-center mx-auto p-8"
    >
      <motion.div variants={itemVariants} custom={1}>
        <Image
          src="/icon.png"
          width={80}
          height={80}
          alt="tools"
          className="mb-4"
        />
      </motion.div>

      <motion.h1 variants={itemVariants} custom={2} className="mb-8">
        <BadgeRotateBorder>tools</BadgeRotateBorder>
      </motion.h1>

      <motion.div variants={itemVariants} custom={3} className="w-full">
        <Command className="rounded-lg border shadow-md w-full">
          <CommandInput autoFocus={!isMobile} placeholder="Pesquisar..." />
          <CommandList>
            <CommandGroup heading="Páginas">
              {PAGE_LIST?.map((page) => (
                <CommandItem
                  key={page.path}
                  onSelect={() => router.push(page.path)}
                >
                  {page.icon}
                  <span>{page.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandEmpty>Nenhum resultado</CommandEmpty>
          </CommandList>
        </Command>
      </motion.div>

      <motion.div variants={itemVariants} custom={4} className="w-full">
        <a
          className="text-xs text-muted-foreground mt-8 flex items-center justify-center gap-2"
          href="https://github.com/joaohouto/next-tools"
        >
          github/joaohouto/next-tools
        </a>
      </motion.div>
    </motion.div>
  );
}
