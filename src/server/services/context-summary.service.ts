import { appSettingService } from "./app-settings.service";
import { getChatModelFromDb } from "./llm";

type ModelIdLike = number | string;

/** What the source content is, so the prompt can be tailored. */
export type ContextSummaryKind = "chat" | "note";

/** Abandon summarization after this long and fall back to no context. */
const SUMMARY_TIMEOUT_MS = 8_000;
/** Below this many characters of source content, summarizing adds no value. */
const MIN_CONTENT_CHARS = 40;
/** Cap the source content fed to the model so a huge transcript stays cheap. */
const MAX_CONTENT_CHARS = 8_000;

const SUMMARY_PROMPT = (kind: ContextSummaryKind, content: string) => {
  const source =
    kind === "chat"
      ? "the conversation transcript below"
      : "the note below";
  return `You are summarizing context so a new AI chat can understand where a follow-up question came from.

Write a concise brief (2-4 sentences) of ${source}, capturing what it is about and any facts a follow-up question would need. Be factual and specific; do not add commentary, headings, or a preamble. Preserve the original language of the content.

Content:
${content}`;
};

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("context summarization timed out")), ms),
    ),
  ]);
}

/**
 * Summarize a piece of source context (a chat transcript or a note) into a short
 * brief, so a spawned "Ask AI" chat can be seeded with the background its
 * highlighted phrase came from.
 *
 * Best-effort: any failure — missing key, provider error, timeout, garbage
 * output — or trivially-short content degrades to an empty string, so the caller
 * spawns the chat with no context (today's behavior) rather than blocking.
 *
 * Runs on the configured background model (Settings → Background Model); if none
 * is configured, it reuses the caller's selected model.
 */
export class ContextSummaryService {
  /** Resolve a chat model for summarization: the configured background model, else the selected model. */
  private async resolveSummaryModel(fallbackModelId: ModelIdLike) {
    const configured = await appSettingService.getBackgroundChatModelId();
    return getChatModelFromDb(configured ?? fallbackModelId, { temperature: 0 });
  }

  async summarize(
    kind: ContextSummaryKind,
    content: string,
    fallbackModelId: ModelIdLike,
  ): Promise<string> {
    const trimmed = content.trim();
    if (trimmed.length < MIN_CONTENT_CHARS) return "";

    try {
      const llm = await this.resolveSummaryModel(fallbackModelId);
      const result = await withTimeout(
        llm.invoke(SUMMARY_PROMPT(kind, trimmed.slice(0, MAX_CONTENT_CHARS))),
        SUMMARY_TIMEOUT_MS,
      );
      return normalizeContent(result.content).trim();
    } catch (error) {
      console.error("Context summarization failed; spawning without context.", error);
      return "";
    }
  }
}

export const contextSummaryService = new ContextSummaryService();
