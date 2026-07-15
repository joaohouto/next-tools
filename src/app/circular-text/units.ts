export type Unit = "px" | "cm" | "mm";

export const PX_PER_MM = 96 / 25.4;

export function toPx(value: number, unit: Unit): number {
  switch (unit) {
    case "mm":
      return value * PX_PER_MM;
    case "cm":
      return value * PX_PER_MM * 10;
    default:
      return value;
  }
}

export function fromPx(px: number, unit: Unit): number {
  switch (unit) {
    case "mm":
      return px / PX_PER_MM;
    case "cm":
      return px / PX_PER_MM / 10;
    default:
      return px;
  }
}

const STEPS: Record<"fontSize" | "letterSpacing" | "radius", Record<Unit, number>> = {
  fontSize: { px: 1, mm: 0.5, cm: 0.1 },
  letterSpacing: { px: 1, mm: 0.5, cm: 0.1 },
  radius: { px: 1, mm: 0.5, cm: 0.1 },
};

export function stepFor(
  field: "fontSize" | "letterSpacing" | "radius",
  unit: Unit,
): number {
  return STEPS[field][unit];
}
