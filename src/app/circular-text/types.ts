import type { Unit } from "./units";

export type FontCategory = "Sans" | "Serif" | "Display" | "Script" | "Mono";

export interface FontOption {
  family: string;
  category: FontCategory;
  weights: number[];
}

export type TextAlign = "start" | "center" | "end";

export interface CircularTextConfig {
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number; // px, canonical unit
  letterSpacing: number; // px, canonical unit
  radius: number; // px, canonical unit
  anchorAngle: number; // degrees, 0 = top, clockwise
  align: TextAlign;
  flip: boolean;
  squareCanvas: boolean;
  color: string;
  bgColor: string;
  unit: Unit;
}
