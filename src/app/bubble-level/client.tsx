import { BubbleLevelDisplay } from "./bubble-level-display";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 w-full max-w-2xl">
        {/* Nível para Superfície Vertical (Celular encostado na parede, borda inferior na mesa) */}
        <BubbleLevelDisplay axis="x" />

        {/* Nível para Alinhamento Vertical (Celular de lado, borda mais curta na mesa) */}
        <BubbleLevelDisplay axis="y" />
      </div>

      <span className="text-muted-foreground text-xs text-center text-balance">
        É necessário que seu dispositivo tenha giroscópio.
      </span>
    </div>
  );
}
