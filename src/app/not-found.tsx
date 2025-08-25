import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertCircle className="size-6" />
      <div className="flex flex-col gap-2">
        <h1 className="font-montserrat text-xl font-semibold text-foreground">
          Oops!
        </h1>
        <p className="text-muted-foreground text-xs max-w-[250px]">
          A página que você está procurando não foi encontrada.
        </p>
      </div>
      <Button variant="outline" className="rounded-full" asChild>
        <Link href="/">
          <ChevronLeft /> Voltar para o Início
        </Link>
      </Button>
    </div>
  );
}
