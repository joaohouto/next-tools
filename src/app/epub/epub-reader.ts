import { unzipSync } from "fflate";
import type { BookChapter, ChapterBlock, ParsedBook } from "./types";

function decode(bytes: Uint8Array | undefined): string {
  if (!bytes) return "";
  return new TextDecoder("utf-8").decode(bytes);
}

function firstText(doc: Document, ...tagNames: string[]): string | undefined {
  for (const tag of tagNames) {
    const text = doc.getElementsByTagName(tag)[0]?.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

// Resolves a manifest href (relative to the OPF's directory) into a ZIP-internal path.
function resolvePath(baseDir: string, href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  const raw = href.startsWith("/") ? href.slice(1) : baseDir + href;
  const segments: string[] = [];
  for (const seg of raw.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") segments.pop();
    else segments.push(seg);
  }
  return decodeURIComponent(segments.join("/"));
}

function parseXhtml(xhtml: string): Document {
  const asXml = new DOMParser().parseFromString(xhtml, "application/xhtml+xml");
  if (asXml.getElementsByTagName("parsererror").length > 0) {
    return new DOMParser().parseFromString(xhtml, "text/html");
  }
  return asXml;
}

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4"]);

function extractBlocks(body: Element): ChapterBlock[] {
  const blocks: ChapterBlock[] = [];
  body.querySelectorAll("h1, h2, h3, h4, p, li, blockquote").forEach((el) => {
    const text = el.textContent?.replace(/\s+/g, " ").trim();
    if (!text) return;
    const type: ChapterBlock["type"] = HEADING_TAGS.has(el.tagName.toLowerCase()) ? "heading" : "paragraph";
    blocks.push({ type, text });
  });
  return blocks;
}

export async function parseEpub(file: File): Promise<ParsedBook> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buf);

  const containerXml = decode(entries["META-INF/container.xml"]);
  if (!containerXml) throw new Error("Arquivo EPUB inválido: META-INF/container.xml não encontrado.");
  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
  const opfPath = containerDoc.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
  if (!opfPath) throw new Error("Arquivo EPUB inválido: rootfile não encontrado no container.");

  const opfXml = decode(entries[opfPath]);
  if (!opfXml) throw new Error("Arquivo EPUB inválido: pacote OPF não encontrado.");
  const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const title = firstText(opfDoc, "dc:title", "title") || file.name.replace(/\.epub$/i, "");
  const author = firstText(opfDoc, "dc:creator", "creator");

  const manifest = new Map<string, { href: string; mediaType: string }>();
  Array.from(opfDoc.getElementsByTagName("item")).forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = item.getAttribute("media-type") ?? "";
    if (id && href) manifest.set(id, { href: resolvePath(opfDir, href), mediaType });
  });

  // Cover: EPUB3 manifest item with properties="cover-image", or EPUB2 <meta name="cover" content="ID">
  let coverHref: string | undefined;
  let coverMime: string | undefined;
  const coverItem = Array.from(opfDoc.getElementsByTagName("item")).find((item) =>
    (item.getAttribute("properties") ?? "").includes("cover-image"),
  );
  if (coverItem) {
    coverHref = resolvePath(opfDir, coverItem.getAttribute("href")!);
    coverMime = coverItem.getAttribute("media-type") ?? undefined;
  } else {
    const coverMetaId = Array.from(opfDoc.getElementsByTagName("meta")).find(
      (m) => m.getAttribute("name") === "cover",
    )?.getAttribute("content");
    if (coverMetaId && manifest.has(coverMetaId)) {
      const m = manifest.get(coverMetaId)!;
      coverHref = m.href;
      coverMime = m.mediaType;
    }
  }
  const coverBytes = coverHref ? entries[coverHref] : undefined;

  const spineIds = Array.from(opfDoc.getElementsByTagName("itemref"))
    .map((el) => el.getAttribute("idref"))
    .filter((id): id is string => !!id);

  const chapters: BookChapter[] = [];
  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item || !/html/i.test(item.mediaType)) continue;
    const bytes = entries[item.href];
    if (!bytes) continue;

    const doc = parseXhtml(decode(bytes));
    const body = doc.getElementsByTagName("body")[0];
    if (!body) continue;

    const blocks = extractBlocks(body);
    if (blocks.length === 0) continue;

    // The first heading (if any) becomes the chapter title — drop it from the body
    // blocks so it isn't rendered twice by the writers.
    const titleIndex = blocks.findIndex((b) => b.type === "heading");
    const chapterTitle =
      titleIndex >= 0
        ? blocks[titleIndex].text
        : item.href.split("/").pop()?.replace(/\.\w+$/, "") ?? `Capítulo ${chapters.length + 1}`;
    const bodyBlocks = titleIndex >= 0 ? blocks.filter((_, i) => i !== titleIndex) : blocks;

    chapters.push({ title: chapterTitle, blocks: bodyBlocks });
  }

  if (chapters.length === 0) {
    throw new Error("Não foi possível extrair capítulos deste EPUB — verifique se o arquivo não está corrompido.");
  }

  return { title, author, coverBytes, coverMime, chapters };
}
