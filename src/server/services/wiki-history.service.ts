import { appSettingService } from "./app-settings.service";
import { getChatModelFromDb } from "./llm";

type ModelIdLike = number | string;

/** Abandon the classify call after this long and skip wiki grounding. */
const CLASSIFY_TIMEOUT_MS = 8_000;
/** Abandon a Wikipedia HTTP call after this long and skip wiki grounding. */
const WIKI_TIMEOUT_MS = 6_000;
/** Skip the classify call for messages shorter than this (greetings, "ok", …). */
const MIN_MESSAGE_LENGTH = 8;
/** Wikipedia language editions we'll search; anything else falls back to "en". */
const SUPPORTED_LANGS = new Set(["en", "th"]);

/** A Wikipedia article used to ground an answer. */
export type WikiSource = {
  title: string;
  url: string;
  lang: string;
  /** The article's summary extract (intro paragraph). */
  summary: string;
};

/** Shape the classify+extract call is asked to return. */
type Classification = {
  isHistorical: boolean;
  searchTerm: string;
  lang: string;
};

const CLASSIFY_PROMPT = (message: string) =>
  `You decide whether a user's message is asking about a HISTORICAL subject (history of a place, event, era, person, civilization, dynasty, war, etc.) that a Wikipedia article could help answer.

Respond with ONLY a compact JSON object, no prose, no code fence:
{"isHistorical": boolean, "searchTerm": string, "lang": string}

- "isHistorical": true only when answering well benefits from an encyclopedic/historical reference. General how-to, coding, math, opinion, or small-talk → false.
- "searchTerm": the best Wikipedia article title to look up (e.g. "Roman Empire", "อาณาจักรอยุธยา"). Empty string when isHistorical is false.
- "lang": the message's language as a 2-letter Wikipedia code ("en" or "th"). Default "en".

Message: ${message}`;

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms),
    ),
  ]);
}

/** Parse the classify call's JSON output, tolerating stray text / code fences. */
function parseClassification(raw: string): Classification | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1)) as Partial<Classification>;
    const searchTerm = typeof obj.searchTerm === "string" ? obj.searchTerm.trim() : "";
    const lang = typeof obj.lang === "string" ? obj.lang.trim().toLowerCase() : "en";
    return {
      isHistorical: obj.isHistorical === true,
      searchTerm,
      lang: SUPPORTED_LANGS.has(lang) ? lang : "en",
    };
  } catch {
    return null;
  }
}

/**
 * Grounds historical questions in the canvas "Ask AI" node with a Wikipedia
 * summary. A cheap LLM call classifies the message and extracts a search term +
 * language; if it's historical, the top Wikipedia hit's summary is fetched.
 *
 * Entirely best-effort: any failure — missing key, provider/network error,
 * timeout, non-historical message, no article found — resolves to `null`, so
 * the chat reply proceeds ungrounded and the feature never blocks a turn.
 *
 * The classify call runs on the configured background model (Settings →
 * Background Model); if none is configured, it reuses the caller's selected
 * model (same resolution as query expansion).
 */
export class WikiHistoryService {
  /** Resolve a chat model for classification: the configured background model, else the selected model. */
  private async resolveClassifyModel(fallbackModelId: ModelIdLike) {
    const configured = await appSettingService.getBackgroundChatModelId();
    return getChatModelFromDb(configured ?? fallbackModelId, { temperature: 0 });
  }

  private async classify(
    message: string,
    fallbackModelId: ModelIdLike,
  ): Promise<Classification | null> {
    const llm = await this.resolveClassifyModel(fallbackModelId);
    const result = await withTimeout(
      llm.invoke(CLASSIFY_PROMPT(message)),
      CLASSIFY_TIMEOUT_MS,
      "wiki classification",
    );
    return parseClassification(normalizeContent(result.content));
  }

  /** Fetch the top Wikipedia hit's summary for a term, or `null`. Falls back to
   *  the English edition when the requested one has no usable summary. */
  private async fetchSummary(term: string, lang: string): Promise<WikiSource | null> {
    const direct = await this.fetchSummaryForLang(term, lang);
    if (direct) return direct;
    if (lang !== "en") return this.fetchSummaryForLang(term, "en");
    return null;
  }

  private async fetchSummaryForLang(
    term: string,
    lang: string,
  ): Promise<WikiSource | null> {
    const origin = `https://${lang}.wikipedia.org`;

    // Resolve the search term to a real article title first — the REST summary
    // endpoint wants a page title, not a free-text query.
    const searchUrl =
      `${origin}/w/rest.php/v1/search/page?` +
      new URLSearchParams({ q: term, limit: "1" }).toString();
    const searchRes = await withTimeout(
      fetch(searchUrl, { headers: { accept: "application/json" } }),
      WIKI_TIMEOUT_MS,
      "wikipedia search",
    );
    if (!searchRes.ok) return null;
    const searchJson = (await searchRes.json()) as {
      pages?: Array<{ key?: string; title?: string }>;
    };
    const top = searchJson.pages?.[0];
    const key = top?.key;
    if (!key) return null;

    const summaryUrl = `${origin}/api/rest_v1/page/summary/${encodeURIComponent(key)}`;
    const summaryRes = await withTimeout(
      fetch(summaryUrl, { headers: { accept: "application/json" } }),
      WIKI_TIMEOUT_MS,
      "wikipedia summary",
    );
    if (!summaryRes.ok) return null;
    const summaryJson = (await summaryRes.json()) as {
      type?: string;
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    // Disambiguation pages aren't useful grounding — skip them.
    if (summaryJson.type === "disambiguation") return null;
    const summary = summaryJson.extract?.trim();
    if (!summary) return null;

    return {
      title: summaryJson.title?.trim() || top?.title?.trim() || key,
      url: summaryJson.content_urls?.desktop?.page || `${origin}/wiki/${encodeURIComponent(key)}`,
      lang,
      summary,
    };
  }

  /**
   * Return a Wikipedia source to ground `message`, or `null` when it isn't a
   * historical question (or anything fails). Never throws.
   */
  async ground(message: string, fallbackModelId: ModelIdLike): Promise<WikiSource | null> {
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE_LENGTH) return null;

    try {
      const classification = await this.classify(trimmed, fallbackModelId);
      if (!classification?.isHistorical || !classification.searchTerm) return null;
      return await this.fetchSummary(classification.searchTerm, classification.lang);
    } catch (error) {
      console.error("Wiki history grounding failed; answering ungrounded.", error);
      return null;
    }
  }
}

export const wikiHistoryService = new WikiHistoryService();
