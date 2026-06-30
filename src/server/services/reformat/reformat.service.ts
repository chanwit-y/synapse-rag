import { splitMarkdown, getSizer, countTokens } from "../chunking";
import { getChatModelFromDb } from "../llm";
import { ServiceError } from "../utils";

type ModelIdLike = number | string;

/**
 * Per-segment input token budget. Reformatting is a ~1:1 length transform, so
 * the model must reproduce the whole segment — keeping each segment well under a
 * typical model's output cap avoids silent truncation. Output ≈ input, so a
 * ~2k-token segment yields a ~2-3k-token completion that fits everywhere.
 */
const SEGMENT_TOKEN_BUDGET = 2_000;
/** Abandon a single segment's call after this long (heavier than chat). */
const SEGMENT_TIMEOUT_MS = 60_000;
/** Hard guard against pathological inputs (a ≤10MB import OCR's to far less). */
const MAX_INPUT_CHARS = 400_000;
/** Below this, reformatting adds no value. */
const MIN_CONTENT_CHARS = 20;

const REFORMAT_SYSTEM = `You re-format a document's raw extracted/OCR text into clean Markdown. You are a FORMATTER, not an editor or summarizer.

You MAY:
- Join lines that extraction or OCR broke mid-sentence.
- Reconstruct clearly tabular data into GitHub-flavored Markdown tables.
- Restore heading hierarchy (#, ##, ...) for text that is visually a heading.
- Remove repeated running headers/footers and standalone page-number lines.

You MUST NOT:
- Summarize, paraphrase, shorten, translate, or "improve" any wording. Keep the original language exactly (Thai stays Thai, English stays English).
- Add, drop, reorder, or merge any actual content.
- Alter numbers, currency, dates, IDs, or codes in any way — copy them character-for-character.
- "Fix" text that looks like garbled OCR — leave illegible text exactly as-is.
- Add any commentary, explanation, or preamble.

Output ONLY the reformatted Markdown — nothing else.`;

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : part && typeof part === "object" && "text" in part
            ? String((part as { text: unknown }).text)
            : "",
      )
      .join("");
  }
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
      setTimeout(() => reject(new Error("AI reformat timed out")), ms),
    ),
  ]);
}

/**
 * Re-format a document's Markdown using an LLM (Strategy: formatting-only, never
 * alters content — see {@link REFORMAT_SYSTEM}). User-triggered and previewed, so
 * unlike best-effort background passes this is **loud + all-or-nothing**: any
 * segment failing aborts the whole reformat (never returns a partial document).
 *
 * Large documents are segmented on Markdown structure (page boundaries are gone
 * by the time content is stored), reformatted per segment under a token budget,
 * and rejoined. The caller diffs the result against the original before saving.
 */
export class ReformatService {
  async reformat(content: string, modelId: ModelIdLike): Promise<string> {
    const trimmed = content.replace(/\r\n/g, "\n").trim();
    if (trimmed.length < MIN_CONTENT_CHARS) {
      throw new ServiceError("Document is too short to reformat.", "VALIDATION");
    }
    if (trimmed.length > MAX_INPUT_CHARS) {
      throw new ServiceError(
        "Document is too large to reformat. Split it first.",
        "VALIDATION",
      );
    }

    const llm = await getChatModelFromDb(modelId, { temperature: 0 });

    // One-shot under budget; otherwise segment on Markdown structure (no overlap
    // — overlap would duplicate content into the output and break fidelity).
    const segments =
      countTokens(trimmed) <= SEGMENT_TOKEN_BUDGET
        ? [trimmed]
        : splitMarkdown(trimmed, SEGMENT_TOKEN_BUDGET, 0, getSizer("tokens"));

    const out: string[] = [];
    for (const segment of segments) {
      const result = await withTimeout(
        llm.invoke([
          { role: "system", content: REFORMAT_SYSTEM },
          { role: "user", content: segment },
        ]),
        SEGMENT_TIMEOUT_MS,
      );
      const formatted = normalizeContent(result.content).trim();
      // Empty / preamble-only output is a failure — never apply a blank segment.
      if (!formatted) {
        throw new ServiceError(
          "The AI returned no usable text. Try again or pick another model.",
          "DEPENDENCY",
        );
      }
      out.push(formatted);
    }

    return out.join("\n\n").trim() + "\n";
  }
}

export const reformatService = new ReformatService();
