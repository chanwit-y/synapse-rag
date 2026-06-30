import type {
  ChunkRecord,
  ContentLang,
  RagChunkStrategy,
  RagSizingUnit,
  SourceFormat,
} from "@/components/container/rag/types";
import { itemRepository, modelRepository } from "@/server/db/repository";
import { getEmbeddingsFromDb } from "../llm";
import { parseId, ServiceError } from "../utils";
import { countTokens, getSizer, type Sizer } from "./sizing";

/** Default percentile for semantic-boundary splitting. */
const DEFAULT_SEMANTIC_PERCENTILE = 95;

export interface ServerChunkOptions {
  strategy: RagChunkStrategy;
  sizingUnit: RagSizingUnit;
  chunkSize: number;
  chunkOverlap: number;
  /** Ordered separators for the `custom` strategy (a `re:` prefix marks a regex). */
  customSeparators?: string[];
  /** Percentile (1–99) for `semantic` splitting; undefined ⇒ 95. */
  semanticThreshold?: number;
  lang: ContentLang;
  /** Embedding model id used by the `semantic` strategy. */
  embeddingModel?: string;
}

interface ChunkDocument {
  id: string;
  name: string;
  content: string;
  contentTh: string | null;
  sourceFormat: SourceFormat | null;
}

type Embed = (texts: string[]) => Promise<number[][]>;

// ---------------------------------------------------------------------------
// Low-level splitters (sizer-parameterized ports of the client chunkUtils)
// ---------------------------------------------------------------------------

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?\n]+[.!?]+|\S[^.!?\n]*$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [text.trim()];
}

/** Pack pre-split units up to `size`, carrying an overlap tail between chunks. */
function packUnits(
  units: string[],
  size: number,
  overlap: number,
  joiner: string,
  sizer: Sizer,
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

    if (sizer.measure(unit) > size) {
      flush();
      const pieces = sizer.window(unit, size, overlap);
      for (let i = 0; i < pieces.length - 1; i++) chunks.push(pieces[i]);
      current = pieces[pieces.length - 1] ?? "";
      continue;
    }

    const candidate = current ? current + joiner + unit : unit;
    if (sizer.measure(candidate) <= size || !current) {
      current = candidate;
    } else {
      flush();
      const tail = sizer.tail(current, overlap);
      current = tail ? tail + joiner + unit : unit;
    }
  }

  flush();
  return chunks;
}

function splitRecursive(text: string, size: number, overlap: number, sizer: Sizer): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const units: string[] = [];
  for (const para of paragraphs) {
    if (sizer.measure(para.trim()) <= size) units.push(para);
    else units.push(...splitSentences(para));
  }
  return packUnits(units, size, overlap, "\n\n", sizer);
}

function splitSentence(text: string, size: number, overlap: number, sizer: Sizer): string[] {
  return packUnits(splitSentences(text), size, overlap, " ", sizer);
}

export function splitMarkdown(text: string, size: number, overlap: number, sizer: Sizer): string[] {
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
    if (sizer.measure(section) <= size) out.push(section);
    else out.push(...splitRecursive(section, size, overlap, sizer));
  }
  return out;
}

/** Split on user-defined separators (a `re:` prefix marks a regex), then pack. */
function splitCustom(
  text: string,
  size: number,
  overlap: number,
  separators: string[] | undefined,
  sizer: Sizer,
): string[] {
  const seps = (separators ?? []).filter((s) => s.length > 0);
  if (seps.length === 0) return splitRecursive(text, size, overlap, sizer);

  let units = [text];
  for (const sep of seps) {
    const splitter: string | RegExp = sep.startsWith("re:")
      ? new RegExp(sep.slice(3), "g")
      : sep;
    units = units.flatMap((u) => u.split(splitter));
  }
  return packUnits(units, size, overlap, "\n", sizer);
}

// ---------------------------------------------------------------------------
// Semantic splitting (embedding-similarity boundaries)
// ---------------------------------------------------------------------------

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 1;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((x, y) => x - y);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

async function splitSemantic(
  text: string,
  size: number,
  overlap: number,
  threshold: number | undefined,
  sizer: Sizer,
  embed: Embed | undefined,
): Promise<string[]> {
  const sentences = splitSentences(text);
  // No embedder or too few sentences: fall back to sentence packing.
  if (!embed || sentences.length < 3) {
    return packUnits(sentences, size, overlap, " ", sizer);
  }

  const vectors = await embed(sentences);
  const distances: number[] = [];
  for (let i = 0; i < vectors.length - 1; i++) {
    distances.push(cosineDistance(vectors[i], vectors[i + 1]));
  }
  const cut = percentile(
    distances,
    threshold ?? DEFAULT_SEMANTIC_PERCENTILE,
  );

  // Group consecutive sentences, breaking where the distance exceeds the cut.
  const groups: string[][] = [[sentences[0]]];
  for (let i = 1; i < sentences.length; i++) {
    if (distances[i - 1] > cut) groups.push([sentences[i]]);
    else groups[groups.length - 1].push(sentences[i]);
  }

  // Respect the size cap within each semantic group.
  const out: string[] = [];
  for (const group of groups) {
    const joined = group.join(" ").trim();
    if (!joined) continue;
    if (sizer.measure(joined) <= size) out.push(joined);
    else out.push(...packUnits(group, size, overlap, " ", sizer));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Strategy dispatch
// ---------------------------------------------------------------------------

/** Map a document's source format to a concrete strategy for the `auto` mode. */
function autoStrategyFor(format: SourceFormat | null): RagChunkStrategy {
  switch (format) {
    case "pdf":
    case "docx":
      return "recursive";
    case "xlsx":
    case "pptx":
    case "md":
      return "markdown";
    case "txt":
      return "sentence";
    default:
      return "markdown";
  }
}

async function splitByStrategy(
  text: string,
  size: number,
  overlap: number,
  strategy: RagChunkStrategy,
  options: ServerChunkOptions,
  sizer: Sizer,
  embed: Embed | undefined,
): Promise<string[]> {
  switch (strategy) {
    case "recursive":
      return splitRecursive(text, size, overlap, sizer);
    case "markdown":
      return splitMarkdown(text, size, overlap, sizer);
    case "sentence":
      return splitSentence(text, size, overlap, sizer);
    case "custom":
      return splitCustom(text, size, overlap, options.customSeparators, sizer);
    case "semantic":
      return splitSemantic(
        text,
        size,
        overlap,
        options.semanticThreshold,
        sizer,
        embed,
      );
    case "fixed":
    default:
      return sizer.window(text, size, overlap);
  }
}

export class ChunkingService {
  /**
   * Generate chunks for the given documents. The `semantic` strategy uses
   * `embed` (the RAG's embedding model) to find topic boundaries.
   */
  async generate(
    documents: ChunkDocument[],
    options: ServerChunkOptions,
    embed?: Embed,
  ): Promise<ChunkRecord[]> {
    const sizer = getSizer(options.sizingUnit);
    const minSize = options.sizingUnit === "tokens" ? 16 : 100;
    const size = Math.max(minSize, options.chunkSize);
    const overlap = Math.min(Math.max(0, options.chunkOverlap), size - 1);

    const all: ChunkRecord[] = [];
    let globalIndex = 0;

    for (const doc of documents) {
      const useThai =
        options.lang === "th" &&
        !!doc.contentTh &&
        doc.contentTh.trim().length > 0;
      const raw = (useThai ? doc.contentTh! : doc.content).replace(/\r\n/g, "\n").trim();
      if (!raw) continue;
      const docLang: ContentLang = useThai ? "th" : "en";

      const strategy =
        options.strategy === "auto"
          ? autoStrategyFor(doc.sourceFormat)
          : options.strategy;

      const slices = await splitByStrategy(
        raw,
        size,
        overlap,
        strategy,
        options,
        sizer,
        embed,
      );

      for (const slice of slices) {
        const content = slice.trim();
        if (!content) continue;
        globalIndex += 1;
        all.push({
          id: `${doc.id}-chunk-${globalIndex}`,
          index: globalIndex,
          documentId: doc.id,
          documentName: doc.name,
          content,
          charCount: content.length,
          tokenEstimate: countTokens(content),
          lang: docLang,
        });
      }
    }

    return all;
  }

  /**
   * Preview chunks for the RAG modal: loads the selected documents, builds an
   * embedder when the `semantic` strategy is chosen, and returns the chunks.
   */
  async preview(
    documentIds: string[],
    options: ServerChunkOptions,
  ): Promise<ChunkRecord[]> {
    const documents = await this.loadDocuments(documentIds);
    if (documents.length === 0) return [];

    const embed =
      options.strategy === "semantic"
        ? await this.buildEmbedder(options.embeddingModel)
        : undefined;

    return this.generate(documents, options, embed);
  }

  private async loadDocuments(documentIds: string[]): Promise<ChunkDocument[]> {
    const ids = documentIds
      .map(parseId)
      .filter((id): id is number => id != null);

    const docs: ChunkDocument[] = [];
    for (const id of ids) {
      const item = await itemRepository.findById(id);
      if (!item || item.type !== "file") continue;
      docs.push({
        id: String(item.id),
        name: item.name,
        content: item.content ?? "",
        contentTh: item.contentTh ?? null,
        sourceFormat: item.sourceFormat ?? null,
      });
    }
    return docs;
  }

  /** Resolve the embedding model and return a batched embed function. */
  private async buildEmbedder(requestedModelId?: string): Promise<Embed> {
    const active = await modelRepository.findActive();
    const match =
      (requestedModelId &&
        active.find((m) => m.type === "embedding" && m.modelId === requestedModelId)) ||
      active.find((m) => m.type === "embedding");
    if (!match) {
      throw new ServiceError(
        "Semantic chunking needs an embedding model. Add one with an API key first.",
        "DEPENDENCY",
      );
    }

    const embeddings = await getEmbeddingsFromDb(match.id, { model: match.modelId });
    return (texts: string[]) => embeddings.embedDocuments(texts);
  }
}

export const chunkingService = new ChunkingService();
