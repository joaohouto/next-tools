export interface ChapterBlock {
  type: "heading" | "paragraph";
  text: string;
}

export interface BookChapter {
  title: string;
  blocks: ChapterBlock[];
}

export interface ParsedBook {
  title: string;
  author?: string;
  coverBytes?: Uint8Array;
  coverMime?: string;
  chapters: BookChapter[];
}
