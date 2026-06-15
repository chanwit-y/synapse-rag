import type {
  ChunkRecord,
  ContentLang,
  DocumentOption,
  RagChunkStrategy,
} from "./types";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** Last `overlap` chars of `text`, trimmed back to a word boundary. */
function overlapTail(text: string, overlap: number): string {
  if (overlap <= 0 || text.length <= overlap) return overlap <= 0 ? "" : text;
  const tail = text.slice(text.length - overlap);
  const spaceIdx = tail.indexOf(" ");
  return spaceIdx > 0 ? tail.slice(spaceIdx + 1) : tail;
}

/** Sliding fixed-size character window (the original behavior). */
function splitFixed(text: string, size: number, overlap: number): string[] {
  const step = Math.max(1, size - overlap);
  const out: string[] = [];

  for (let start = 0; start < text.length; start += step) {
    const slice = text.slice(start, start + size).trim();
    if (slice) out.push(slice);
    if (start + size >= text.length) break;
  }

  return out;
}

/**
 * Pack pre-split units up to `size`, joining with `joiner` and carrying an
 * `overlap`-char tail from the previous chunk. Units larger than `size` are
 * hard-split with the fixed window as a last resort.
 */
function packUnits(
  units: string[],
  size: number,
  overlap: number,
  joiner: string,
): string[] {
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const rawUnit of units) {
    const unit = rawUnit.trim();
    if (!unit) continue;

    if (unit.length > size) {
      flush();
      const pieces = splitFixed(unit, size, overlap);
      // Emit all but the last; keep the last as the running buffer so the next
      // unit can pack onto it.
      for (let i = 0; i < pieces.length - 1; i++) chunks.push(pieces[i]);
      current = pieces[pieces.length - 1] ?? "";
      continue;
    }

    const candidate = current ? current + joiner + unit : unit;
    if (candidate.length <= size || !current) {
      current = candidate;
    } else {
      flush();
      const tail = overlapTail(current, overlap);
      current = tail ? tail + joiner + unit : unit;
    }
  }

  flush();
  return chunks;
}

/** Paragraph → sentence descent, then packed up to `size`. */
function splitRecursive(text: string, size: number, overlap: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const units: string[] = [];

  for (const para of paragraphs) {
    if (para.trim().length <= size) {
      units.push(para);
    } else {
      units.push(...splitSentences(para));
    }
  }

  return packUnits(units, size, overlap, "\n\n");
}

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?\n]+[.!?]+|\S[^.!?\n]*$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [text.trim()];
}

/** One-or-more sentences per chunk, packed up to `size`. */
function splitSentence(text: string, size: number, overlap: number): string[] {
  return packUnits(splitSentences(text), size, overlap, " ");
}

/**
 * Split by markdown headings so each section becomes a chunk; sections larger
 * than `size` fall back to a recursive split.
 */
function splitMarkdown(text: string, size: number, overlap: number): string[] {
  const lines = text.split("\n");
  const sections: string[] = [];
  let buffer: string[] = [];

  const pushBuffer = () => {
    const section = buffer.join("\n").trim();
    if (section) sections.push(section);
    buffer = [];
  };

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) pushBuffer();
    buffer.push(line);
  }
  pushBuffer();

  const out: string[] = [];
  for (const section of sections) {
    if (section.length <= size) out.push(section);
    else out.push(...splitRecursive(section, size, overlap));
  }

  return out;
}

function splitByStrategy(
  text: string,
  size: number,
  overlap: number,
  strategy: RagChunkStrategy,
): string[] {
  switch (strategy) {
    case "recursive":
      return splitRecursive(text, size, overlap);
    case "markdown":
      return splitMarkdown(text, size, overlap);
    case "sentence":
      return splitSentence(text, size, overlap);
    case "fixed":
    default:
      return splitFixed(text, size, overlap);
  }
}

export function generateChunks(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  strategy: RagChunkStrategy = "fixed",
): ChunkRecord[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const size = Math.max(100, chunkSize);
  const overlap = Math.min(Math.max(0, chunkOverlap), size - 1);

  const slices = splitByStrategy(normalized, size, overlap, strategy);

  return slices
    .map((slice) => slice.trim())
    .filter(Boolean)
    .map((slice, index) => ({
      id: `chunk-${index}`,
      index: index + 1,
      documentId: "",
      documentName: "",
      content: slice,
      charCount: slice.length,
      tokenEstimate: estimateTokens(slice),
      lang: "en" as ContentLang,
    }));
}

export function generateChunksFromDocuments(
  documents: DocumentOption[],
  chunkSize: number,
  chunkOverlap: number,
  lang: ContentLang = "en",
  strategy: RagChunkStrategy = "fixed",
): ChunkRecord[] {
  const allChunks: ChunkRecord[] = [];
  let globalIndex = 0;

  for (const doc of documents) {
    // Use the Thai translation only when requested AND available; otherwise
    // fall back to the English source for that document.
    const useThai = lang === "th" && !!doc.contentTh && doc.contentTh.trim().length > 0;
    const text = useThai ? doc.contentTh! : doc.content;
    const docLang: ContentLang = useThai ? "th" : "en";

    const docChunks = generateChunks(text, chunkSize, chunkOverlap, strategy);
    for (const chunk of docChunks) {
      globalIndex += 1;
      allChunks.push({
        ...chunk,
        id: `${doc.id}-chunk-${chunk.id}`,
        index: globalIndex,
        documentId: doc.id,
        documentName: doc.name,
        lang: docLang,
      });
    }
  }

  return allChunks;
}

export function truncatePreview(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}
