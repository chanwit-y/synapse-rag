import { getEncoding, type Tiktoken } from "js-tiktoken";
import type { RagSizingUnit } from "@/server/db/schema/enums";

let encoder: Tiktoken | null = null;
function enc(): Tiktoken {
  if (!encoder) encoder = getEncoding("cl100k_base");
  return encoder;
}

/** Real token count for a string (cl100k_base — OpenAI/most models' base). */
export function countTokens(text: string): number {
  return enc().encode(text).length;
}

/**
 * Measures and slices text in a chosen unit (characters or tokens) so the same
 * packing logic serves both `sizingUnit` modes.
 */
export interface Sizer {
  /** Size of `text` in this unit. */
  measure(text: string): number;
  /** Hard-window long text into pieces of ≤ `size` with `overlap` carry-over. */
  window(text: string, size: number, overlap: number): string[];
  /** Last `overlap` units of `text`, trimmed forward to a word boundary. */
  tail(text: string, overlap: number): string;
}

const charSizer: Sizer = {
  measure: (text) => text.length,
  window(text, size, overlap) {
    const step = Math.max(1, size - overlap);
    const out: string[] = [];
    for (let start = 0; start < text.length; start += step) {
      const slice = text.slice(start, start + size).trim();
      if (slice) out.push(slice);
      if (start + size >= text.length) break;
    }
    return out;
  },
  tail(text, overlap) {
    if (overlap <= 0) return "";
    if (text.length <= overlap) return text;
    const tail = text.slice(text.length - overlap);
    const spaceIdx = tail.indexOf(" ");
    return spaceIdx > 0 ? tail.slice(spaceIdx + 1) : tail;
  },
};

const tokenSizer: Sizer = {
  measure: (text) => countTokens(text),
  window(text, size, overlap) {
    const ids = enc().encode(text);
    if (ids.length <= size) {
      const trimmed = text.trim();
      return trimmed ? [trimmed] : [];
    }
    const step = Math.max(1, size - overlap);
    const out: string[] = [];
    for (let start = 0; start < ids.length; start += step) {
      const slice = enc().decode(ids.slice(start, start + size)).trim();
      if (slice) out.push(slice);
      if (start + size >= ids.length) break;
    }
    return out;
  },
  tail(text, overlap) {
    if (overlap <= 0) return "";
    const ids = enc().encode(text);
    if (ids.length <= overlap) return text;
    const tailText = enc().decode(ids.slice(ids.length - overlap));
    const spaceIdx = tailText.indexOf(" ");
    return spaceIdx > 0 ? tailText.slice(spaceIdx + 1) : tailText;
  },
};

export function getSizer(unit: RagSizingUnit): Sizer {
  return unit === "tokens" ? tokenSizer : charSizer;
}
