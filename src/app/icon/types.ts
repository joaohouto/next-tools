export type IconSource =
  | { type: "lucide"; name: string }
  | { type: "emoji"; char: string }
  | { type: "custom" };

export type IconConfig = {
  bgColor: string;
  fgColor: string;
  iconSize: number;
  iconStrokeWidth: number;
  iconRotation: number;
  borderRadius: number;
  imageSize: number;
  format: string;
  showGuidelines: boolean;
  customSVGCode: string;
};
