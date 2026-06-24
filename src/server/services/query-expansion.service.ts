import { appSettingService } from "./app-settings.service";
import { getChatModelFromDb } from "./llm";

type ModelIdLike = number | string;

/** Number of alternative query phrasings to generate (the original is searched separately). */
const EXPANSION_COUNT = 3;
/** Abandon expansion after this long and fall back to the original query only. */
const EXPANSION_TIMEOUT_MS = 8_000;

const EXPANSION_PROMPT = (question: string) =>
  `You are an expert AI search assistant. Generate ${EXPANSION_COUNT} alternative versions of the given user question to retrieve relevant documents from a vector database.

By generating multiple perspectives, you help overcome the limitations of distance-based similarity search (exact terminology mismatch, spacing, hyphenation). Include synonyms, alternative spellings, and expanded technical terms where applicable. Preserve the original language of the question.

Provide these alternative questions separated by newlines. Do not include any introductory text, numbering, or explanations. Do not repeat the original question.

Original question: ${question}`;

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

/** Split the model output into clean query lines, stripping numbering/bullets and the echoed original. */
function parseQueries(raw: string, original: string): string[] {
  const seen = new Set<string>([original.trim().toLowerCase()]);
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    const cleaned = line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= EXPANSION_COUNT) break;
  }
  return out;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("query expansion timed out")), ms),
    ),
  ]);
}

/**
 * Generate alternative phrasings of a search query to widen vector-search recall
 * (multi-query retrieval). Best-effort: any failure — missing key, provider
 * error, timeout, garbage output — degrades silently to an empty list so the
 * caller falls back to searching the original query alone.
 *
 * The expansion runs on the configured background model (Settings → Background
 * Model); if none is configured, it reuses the caller's selected model.
 */
export class QueryExpansionService {
  /** Resolve a chat model for expansion: the configured background model, else the selected model. */
  private async resolveExpansionModel(fallbackModelId: ModelIdLike) {
    const configured = await appSettingService.getBackgroundChatModelId();
    return getChatModelFromDb(configured ?? fallbackModelId, { temperature: 0 });
  }

  async expandQuery(prompt: string, fallbackModelId: ModelIdLike): Promise<string[]> {
    const original = prompt.trim();
    if (!original) return [];

    try {
      const llm = await this.resolveExpansionModel(fallbackModelId);
      const result = await withTimeout(
        llm.invoke(EXPANSION_PROMPT(original)),
        EXPANSION_TIMEOUT_MS,
      );
      return parseQueries(normalizeContent(result.content), original);
    } catch (error) {
      console.error("Query expansion failed; falling back to original query.", error);
      return [];
    }
  }
}

export const queryExpansionService = new QueryExpansionService();
