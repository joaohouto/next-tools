// ─── shared frame-extractor types ─────────────────────────────────────────────

/** A single marked moment of the video, plus its caption. */
export interface Frame {
  id: string;
  /** Real `video.currentTime` after the seek settled — never the requested time. */
  time: number;
  /** Small JPEG data URL (~320px wide) used by the marker, the card and the preview. */
  thumb: string;
  caption: string;
}

/** Playable video the editor works on — either the original file or a transcoded copy. */
export interface VideoSource {
  url: string;
  /** True when the browser couldn't decode the original and ffmpeg.wasm converted it. */
  transcoded: boolean;
  duration: number;
  width: number;
  height: number;
}

export type PrepareStage = "probing" | "loading-ffmpeg" | "transcoding";

export interface PrepareProgress {
  stage: PrepareStage;
  /** 0–1, only meaningful while transcoding. */
  ratio: number;
}

export type Columns = 1 | 2 | 3;

export interface ExportSettings {
  columns: Columns;
  showIndex: boolean;
  showTimecode: boolean;
  showCaption: boolean;
  /** Optional heading printed on the first sheet. */
  title: string;
  /** `true` → A4 sheets (PDF); `false` → one tall sheet (PNG). */
  paginate: boolean;
}
