import type { DocumentOption, RagRecord } from "@/components/container/rag/types";
import type { Item, Rag } from "@/server/db/repository";
import { toIdString, toIsoString } from "../utils";

type RagWithLinks = Rag & {
  items?: Array<{ item: Item & { collection?: { name: string } | null } }>;
};

/** Parse the JSON-encoded `string[]` of custom separators; undefined when unset/invalid. */
function parseSeparators(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed as string[];
    }
  } catch {
    // fall through
  }
  return undefined;
}

export function toRagRecord(
  row: RagWithLinks,
  linkedItems?: Array<Item & { collection?: { name: string } | null }>,
): RagRecord {
  const items = linkedItems ?? row.items?.map((link) => link.item) ?? [];

  return {
    id: toIdString(row.id),
    name: row.name,
    documentIds: items.map((item) => toIdString(item.id)),
    documentNames: items.map((item) => item.name),
    method: row.method,
    chunkStrategy: row.chunkStrategy,
    sizingUnit: row.sizingUnit,
    chunkSize: row.chunkSize,
    chunkOverlap: row.chunkOverlap,
    customSeparators: parseSeparators(row.customSeparators),
    semanticThreshold: row.semanticThreshold ?? undefined,
    embeddingModel: row.embeddingModel ?? undefined,
    includeMetadata: row.includeMetadata,
    chunkCount: row.chunkCount,
    status: row.status,
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function toDocumentOption(
  item: Item & { collection?: { name: string } | null },
  collectionPath?: string,
): DocumentOption {
  const collectionLabel = collectionPath ?? item.collection?.name ?? "Documents";

  // Expose both languages; the RAG modal lets the user choose which to index
  // when a Thai translation is available.
  const hasThai = item.contentTh != null && item.contentTh.trim().length > 0;

  return {
    id: toIdString(item.id),
    name: item.name,
    collection: collectionLabel,
    content: item.content ?? "",
    contentTh: hasThai ? item.contentTh! : null,
    sourceFormat: item.sourceFormat ?? null,
  };
}
