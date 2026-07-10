import { zipSync, type Zippable } from "fflate";
import type { BookChapter, ParsedBook } from "./types";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function chapterXhtml(title: string, blocks: BookChapter["blocks"]): string {
  const body = blocks
    .map((b) => (b.type === "heading" ? `<h2>${escapeXml(b.text)}</h2>` : `<p>${escapeXml(b.text)}</p>`))
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"/><title>${escapeXml(title)}</title></head>
<body>
<h1>${escapeXml(title)}</h1>
${body}
</body>
</html>`;
}

// Builds a valid, minimal EPUB3 archive from extracted chapters. `mimetype` must be the
// first entry and stored uncompressed (level: 0) — the only strict structural requirement
// of the EPUB/OCF spec that most readers actually enforce.
export function buildEpub(book: ParsedBook): Uint8Array {
  const encoder = new TextEncoder();
  const id = `urn:uuid:${crypto.randomUUID()}`;
  const coverExt = book.coverMime?.includes("png") ? "png" : "jpg";
  const hasCover = !!book.coverBytes;

  const files: Zippable = {
    mimetype: [encoder.encode("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": encoder.encode(
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    ),
  };

  const manifestItems: string[] = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  ];
  const spineItems: string[] = [];

  if (hasCover && book.coverBytes) {
    files[`OEBPS/cover.${coverExt}`] = book.coverBytes;
    manifestItems.push(
      `<item id="cover-img" href="cover.${coverExt}" media-type="image/${coverExt === "png" ? "png" : "jpeg"}" properties="cover-image"/>`,
    );
    files["OEBPS/cover.xhtml"] = encoder.encode(
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"/><title>Capa</title></head>
<body style="text-align:center;">
<img src="cover.${coverExt}" alt="Capa" style="max-width:100%;height:auto;"/>
</body>
</html>`,
    );
    manifestItems.push(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="cover"/>`);
  }

  const navLinks: string[] = [];
  book.chapters.forEach((chapter, i) => {
    const n = i + 1;
    const href = `chapter-${n}.xhtml`;
    files[`OEBPS/${href}`] = encoder.encode(chapterXhtml(chapter.title, chapter.blocks));
    manifestItems.push(`<item id="chap${n}" href="${href}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="chap${n}"/>`);
    navLinks.push(`<li><a href="${href}">${escapeXml(chapter.title)}</a></li>`);
  });

  files["OEBPS/nav.xhtml"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="utf-8"/><title>Sumário</title></head>
<body>
<nav epub:type="toc" id="toc">
<h1>Sumário</h1>
<ol>
${navLinks.join("\n")}
</ol>
</nav>
</body>
</html>`,
  );

  files["OEBPS/content.opf"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    ${book.author ? `<dc:creator>${escapeXml(book.author)}</dc:creator>` : ""}
    <dc:language>pt</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine>
    ${spineItems.join("\n    ")}
  </spine>
</package>`,
  );

  return zipSync(files, { level: 6 });
}
