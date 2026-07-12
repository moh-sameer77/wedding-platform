const ALLOWED_SIGNATURES: Array<{
  mime: string;
  kind: "image" | "video" | "audio";
  ext: string;
  matches: (buffer: Buffer) => boolean;
}> = [
  {
    mime: "image/jpeg",
    kind: "image",
    ext: ".jpg",
    matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mime: "image/png",
    kind: "image",
    ext: ".png",
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mime: "image/gif",
    kind: "image",
    ext: ".gif",
    matches: (buffer) => {
      const header = buffer.subarray(0, 6).toString("ascii");
      return header === "GIF87a" || header === "GIF89a";
    },
  },
  {
    mime: "image/webp",
    kind: "image",
    ext: ".webp",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    mime: "image/heic",
    kind: "image",
    ext: ".heic",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(
        buffer.subarray(8, 12).toString("ascii"),
      ),
  },
  {
    mime: "video/mp4",
    kind: "video",
    ext: ".mp4",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "M4A ", "dash"].includes(
        buffer.subarray(8, 12).toString("ascii"),
      ),
  },
  {
    mime: "video/quicktime",
    kind: "video",
    ext: ".mov",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["qt  ", "moov"].includes(buffer.subarray(8, 12).toString("ascii")),
  },
  {
    mime: "video/webm",
    kind: "video",
    ext: ".webm",
    matches: (buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  },
  {
    mime: "audio/webm",
    kind: "audio",
    ext: ".webm",
    matches: (buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  },
  {
    mime: "audio/mp4",
    kind: "audio",
    ext: ".m4a",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["M4A ", "M4B ", "mp41", "mp42", "isom"].includes(
        buffer.subarray(8, 12).toString("ascii"),
      ),
  },
  {
    mime: "audio/mpeg",
    kind: "audio",
    ext: ".mp3",
    matches: (buffer) => {
      if (buffer.length < 3) return false;
      const tag = buffer.subarray(0, 3).toString("ascii");
      return (
        tag === "ID3" ||
        (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
      );
    },
  },
  {
    mime: "audio/ogg",
    kind: "audio",
    ext: ".ogg",
    matches: (buffer) =>
      buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS",
  },
  {
    mime: "audio/wav",
    kind: "audio",
    ext: ".wav",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE",
  },
];

export interface DetectedFile {
  mime: string;
  kind: "image" | "video" | "audio";
  ext: string;
}

export function detectFileType(buffer: Buffer): DetectedFile | null {
  for (const signature of ALLOWED_SIGNATURES) {
    if (signature.matches(buffer)) {
      return {
        mime: signature.mime,
        kind: signature.kind,
        ext: signature.ext,
      };
    }
  }
  return null;
}

export function isSafeDeclaredMime(
  declaredMime: string | undefined,
  detected: DetectedFile,
): boolean {
  if (!declaredMime) return false;
  const normalized = declaredMime.split(";")[0]!.trim().toLowerCase();
  return normalized === detected.mime;
}
