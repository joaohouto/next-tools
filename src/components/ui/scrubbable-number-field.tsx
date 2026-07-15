"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ScrubbableNumberFieldProps {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  step?: number;
  dragSensitivity?: number;
  onChange: (value: number) => void;
  className?: string;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

interface DragState {
  startX: number;
  startValue: number;
  dragged: boolean;
}

/**
 * Figma-style number field: drag horizontally over the value to scrub it
 * (no min/max), or click without dragging to type an exact value.
 */
export function ScrubbableNumberField({
  label,
  value,
  unit = "",
  decimals = 0,
  step = 1,
  dragSensitivity,
  onChange,
  className,
}: ScrubbableNumberFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const rate = dragSensitivity ?? step;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function handlePointerDown(e: React.PointerEvent<HTMLInputElement>) {
    if (editing) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startValue: value, dragged: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLInputElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (!drag.dragged && Math.abs(dx) < 3) return;
    drag.dragged = true;
    const sensitivity = e.shiftKey ? rate / 10 : rate;
    onChange(roundTo(drag.startValue + dx * sensitivity, decimals));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLInputElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drag && !drag.dragged) {
      setDraft(value.toFixed(decimals));
      setEditing(true);
    }
  }

  function commit() {
    const parsed = parseFloat(draft.replace(",", "."));
    if (!Number.isNaN(parsed)) onChange(roundTo(parsed, decimals));
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? step * 10 : step);
      const base = parseFloat(draft.replace(",", ".")) || value;
      setDraft(roundTo(base + delta, decimals).toFixed(decimals));
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label
        htmlFor={id}
        className="flex-1 min-w-0 truncate text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        {label}
      </Label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        readOnly={!editing}
        value={editing ? draft : `${value.toFixed(decimals)}${unit}`}
        onChange={(e) => editing && setDraft(e.target.value)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onBlur={() => editing && commit()}
        style={{ touchAction: "none" }}
        className={cn(
          "shrink-0 w-[72px] font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground text-center outline-none border border-transparent",
          editing
            ? "cursor-text select-text focus:border-primary"
            : "cursor-ew-resize select-none",
        )}
      />
    </div>
  );
}
