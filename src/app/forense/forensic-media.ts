import type { MediaMeta, Id3Tags } from "./forensic-types";

// ─── HTMLMediaElement duration ─────────────────────────────────────────────────

function getMediaDuration(file: File): Promise<{ duration: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "audio") as HTMLVideoElement;
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const result = {
        duration: el.duration,
        width: isVideo ? (el as HTMLVideoElement).videoWidth || undefined : undefined,
        height: isVideo ? (el as HTMLVideoElement).videoHeight || undefined : undefined,
      };
      URL.revokeObjectURL(url);
      el.remove();
      resolve(result);
    };
    el.onerror = () => { URL.revokeObjectURL(url); resolve({ duration: 0 }); };
    el.src = url;
    document.body.appendChild(el);
  });
}

// ─── ID3v2 parser ─────────────────────────────────────────────────────────────

function synchsafeToInt(bytes: Uint8Array, off: number): number {
  return (
    ((bytes[off] & 0x7f) << 21) |
    ((bytes[off + 1] & 0x7f) << 14) |
    ((bytes[off + 2] & 0x7f) << 7) |
    (bytes[off + 3] & 0x7f)
  );
}

function readFrameSize(bytes: Uint8Array, off: number, version: number): number {
  if (version >= 4) return synchsafeToInt(bytes, off);
  return (bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3];
}

function parseTextFrame(data: Uint8Array): string {
  if (data.length === 0) return "";
  const enc = data[0];
  const content = data.slice(1);
  if (enc === 0) return new TextDecoder("latin1").decode(content).replace(/\0/g, "");
  if (enc === 1 || enc === 2) return new TextDecoder("utf-16").decode(content).replace(/\0/g, "");
  return new TextDecoder("utf-8").decode(content).replace(/\0/g, "");
}

function parseId3(buf: Uint8Array): Id3Tags {
  if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return {};
  const version = buf[3];
  const size = synchsafeToInt(buf, 6);
  const tags: Id3Tags = {};
  let pos = 10;
  let coverUrl: string | undefined;

  while (pos < 10 + size && pos + 10 <= buf.length) {
    const frameId = new TextDecoder().decode(buf.slice(pos, pos + 4));
    if (frameId === "\0\0\0\0") break;
    const frameSize = readFrameSize(buf, pos + 4, version);
    if (frameSize <= 0 || pos + 10 + frameSize > buf.length) break;
    const frameData = buf.slice(pos + 10, pos + 10 + frameSize);

    if (frameId === "TIT2") tags.title = parseTextFrame(frameData);
    else if (frameId === "TPE1") tags.artist = parseTextFrame(frameData);
    else if (frameId === "TALB") tags.album = parseTextFrame(frameData);
    else if (frameId === "TYER" || frameId === "TDRC") tags.year = parseTextFrame(frameData);
    else if (frameId === "APIC" && !coverUrl) {
      // APIC: encoding(1) + mime(null-terminated) + picType(1) + desc(null-terminated) + data
      let i = 1;
      while (i < frameData.length && frameData[i] !== 0) i++;
      i++; // skip null
      i++; // skip picture type
      while (i < frameData.length && frameData[i] !== 0) i++;
      i++; // skip null after desc
      const imgData = frameData.slice(i);
      const blob = new Blob([imgData], { type: "image/jpeg" });
      coverUrl = URL.createObjectURL(blob);
    }

    pos += 10 + frameSize;
  }

  if (coverUrl) tags.coverUrl = coverUrl;
  return tags;
}

// ─── Vorbis Comment (FLAC) ────────────────────────────────────────────────────

function parseVorbisComment(buf: Uint8Array): Record<string, string> {
  const result: Record<string, string> = {};
  if (buf.length < 4) return result;
  const view = new DataView(buf.buffer, buf.byteOffset);
  let off = 0;
  // vendor string length (LE)
  const vendorLen = view.getUint32(off, true); off += 4;
  off += vendorLen;
  if (off + 4 > buf.length) return result;
  const count = view.getUint32(off, true); off += 4;
  for (let i = 0; i < count && off + 4 <= buf.length; i++) {
    const len = view.getUint32(off, true); off += 4;
    if (off + len > buf.length) break;
    const comment = new TextDecoder().decode(buf.slice(off, off + len));
    const eqIdx = comment.indexOf("=");
    if (eqIdx > 0) result[comment.slice(0, eqIdx).toLowerCase()] = comment.slice(eqIdx + 1);
    off += len;
  }
  return result;
}

function parseFLACVorbisBlock(buf: Uint8Array): Record<string, string> {
  // FLAC format: first 4 bytes = "fLaC", then metadata blocks
  if (buf[0] !== 0x66 || buf[1] !== 0x4c || buf[2] !== 0x61 || buf[3] !== 0x43) return {};
  let pos = 4;
  while (pos + 4 <= buf.length) {
    const header = buf[pos];
    const last = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const size = (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3];
    pos += 4;
    if (type === 4) { // VORBIS_COMMENT
      return parseVorbisComment(buf.slice(pos, pos + size));
    }
    pos += size;
    if (last) break;
  }
  return {};
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function extractMediaMeta(file: File, buffer: ArrayBuffer): Promise<MediaMeta> {
  const buf = new Uint8Array(buffer);
  const result: MediaMeta = {};

  const media = await getMediaDuration(file).catch(() => ({ duration: 0 as number, width: undefined as number | undefined, height: undefined as number | undefined }));
  if (media.duration && isFinite(media.duration)) result.duration = Math.round(media.duration * 10) / 10;
  if ("width" in media && media.width) result.width = media.width;
  if ("height" in media && media.height) result.height = media.height;

  // ID3 (MP3)
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    result.id3 = parseId3(buf);
  }

  // FLAC Vorbis
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) {
    const vorbis = parseFLACVorbisBlock(buf);
    if (Object.keys(vorbis).length > 0) result.vorbis = vorbis;
  }

  return result;
}
