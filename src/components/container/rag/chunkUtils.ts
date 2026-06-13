import type { ChunkRecord, ContentLang, DocumentOption } from "./types";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function generateChunks(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): ChunkRecord[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const size = Math.max(100, chunkSize);
  const overlap = Math.min(Math.max(0, chunkOverlap), size - 1);
  const step = Math.max(1, size - overlap);
  const chunks: ChunkRecord[] = [];

  for (let start = 0, index = 0; start < normalized.length; start += step, index++) {
    const slice = normalized.slice(start, start + size).trim();
    if (!slice) continue;

    chunks.push({
      id: `chunk-${index}`,
      index: index + 1,
      documentId: "",
      documentName: "",
      content: slice,
      charCount: slice.length,
      tokenEstimate: estimateTokens(slice),
      lang: "en",
    });

    if (start + size >= normalized.length) break;
  }

  return chunks;
}

export function generateChunksFromDocuments(
  documents: DocumentOption[],
  chunkSize: number,
  chunkOverlap: number,
  lang: ContentLang = "en",
): ChunkRecord[] {
  const allChunks: ChunkRecord[] = [];
  let globalIndex = 0;

  for (const doc of documents) {
    // Use the Thai translation only when requested AND available; otherwise
    // fall back to the English source for that document.
    const useThai = lang === "th" && !!doc.contentTh && doc.contentTh.trim().length > 0;
    const text = useThai ? doc.contentTh! : doc.content;
    const docLang: ContentLang = useThai ? "th" : "en";

    const docChunks = generateChunks(text, chunkSize, chunkOverlap);
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
