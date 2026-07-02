import { cn } from "@/lib/utils";

export function ControlsBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-muted/20 p-4 flex flex-col gap-4", className)}>{children}</div>
  );
}

export function ColumnHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{children}</h2>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-[140px] rounded-2xl border border-dashed flex items-center justify-center text-center text-sm text-muted-foreground p-6">
      {children}
    </div>
  );
}
