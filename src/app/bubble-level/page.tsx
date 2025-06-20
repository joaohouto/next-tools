"use client";

import { AlertCircle } from "lucide-react";
import { BubbleLevelDisplay } from "./bubble-level-display";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 w-full max-w-6xl">
        {/* Nível para Superfície Horizontal (Celular deitado na mesa) */}
        <BubbleLevelDisplay axis="both" />

        {/* Nível para Superfície Vertical (Celular encostado na parede, borda inferior na mesa) */}
        <BubbleLevelDisplay axis="x" />

        {/* Nível para Alinhamento Vertical (Celular de lado, borda mais curta na mesa) */}
        <BubbleLevelDisplay axis="y" />
      </div>

      <p className="max-w-[400px] text-xs text-balance text-muted-foreground text-center px-4 flex flex-col items-center justify-center gap-2">
        <AlertCircle className="size-4" />
        Pode ser necessário conceder permissão para o navegador acessar os
        sensores de movimento do seu dispositivo.
      </p>
    </div>
  );
}
