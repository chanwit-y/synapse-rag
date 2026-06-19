"use server";

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  aiInstructionService,
  contextSummaryService,
  getChatModelFromDb,
  getEmbeddingsFromDb,
  queryExpansionService,
  type ContextSummaryKind,
} from "@/server/services";
import {
  itemRepository,
  modelRepository,
  ragChunkRepository,
} from "@/server/db/repository";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export type LangChainChatTestInput = {
  modelId: string;
  prompt: string;
};

export type LangChainChatTestOutput = {
  content: string;
};

/** One turn of a multi-turn conversation sent to the model. */
export type LangChainChatTurn = {
  role: "user" | "ai";
  text: string;
};

export type LangChainChatTurnsInput = {
  modelId: string;
  messages: LangChainChatTurn[];
  /** Optional AI instruction template id — its content is injected as a system
   *  prompt ahead of the transcript. */
  instructionId?: string | null;
  /** Optional pre-computed context brief (e.g. a summary of the conversation an
   *  "Ask AI" node was spawned from) — injected as a system prompt so the chat
   *  stays grounded in where its question came from. */
  contextSummary?: string | null;
};

export type LangChainRagChatInput = {
  modelId: string;
  prompt: string;
  ragIds: string[];
  topK?: number;
  /** Optional AI instruction template id — its content is injected as a system prompt. */
  instructionId?: string | null;
};

type ChatSourceImage = { src: string; alt: string };

export type LangChainRagChatOutput = {
  content: string;
  contextChunks: Array<{
    ragId: string;
    chunkId: string;
    content: string;
    metadata: Record<string, unknown> | null;
  }>;
};

/** Max source images offered to the model for a single answer. */
const MAX_SOURCE_IMAGES = 6;

/** Reciprocal Rank Fusion constant — dampens the contribution of lower ranks. */
const RRF_K = 60;

/** Markdown image: ![alt](src "title") — src up to the first space or ')'. */
const MD_IMAGE_RE = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)[^)]*\)/g;
/** HTML image: <img ... src="..."> (single or double quotes). */
const HTML_IMAGE_RE = /<img\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;

/** Extract image references ({src, alt}) from markdown/HTML, deduped by src. */
function extractImages(texts: string[]): ChatSourceImage[] {
  const bySrc = new Map<string, ChatSourceImage>();

  const add = (rawSrc: string, alt: string) => {
    const src = rawSrc.replace(/^<|>$/g, "").trim();
    if (!src || bySrc.has(src)) return;
    bySrc.set(src, { src, alt: alt.trim() });
  };

  for (const text of texts) {
    if (!text) continue;
    for (const m of text.matchAll(MD_IMAGE_RE)) add(m[2], m[1] ?? "");
    for (const m of text.matchAll(HTML_IMAGE_RE)) add(m[2], "");
  }

  return [...bySrc.values()].slice(0, MAX_SOURCE_IMAGES);
}

/**
 * Resolve source images for the retrieved chunks. Images are pulled from each
 * chunk's *source document* (not the chunk text), because chunking can split
 * an `![](...)` reference across a boundary and lose it. Documents are visited
 * in retrieval order so the most relevant images come first.
 */
async function resolveSourceImages(
  chunks: LangChainRagChatOutput["contextChunks"],
): Promise<ChatSourceImage[]> {
  const documentIds: number[] = [];
  const seen = new Set<number>();
  for (const chunk of chunks) {
    const rawId = (chunk.metadata as { documentId?: unknown } | null)?.documentId;
    const id = Number(rawId);
    if (Number.isInteger(id) && id > 0 && !seen.has(id)) {
      seen.add(id);
      documentIds.push(id);
    }
  }
  if (documentIds.length === 0) return [];

  const docs = await Promise.all(documentIds.map((id) => itemRepository.findById(id)));
  return extractImages(docs.map((doc) => doc?.content ?? ""));
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

export async function chatWithModelFromDbAction(
  input: LangChainChatTestInput,
): Promise<ActionResult<LangChainChatTestOutput>> {
  try {
    const prompt = input.prompt.trim();
    if (!prompt) {
      return actionSuccess({ content: "" });
    }

    const llm = await getChatModelFromDb(input.modelId);
    const result = await llm.invoke(prompt);

    return actionSuccess({ content: normalizeMessageContent(result.content) });
  } catch (error) {
    return actionFailure(error);
  }
}

/**
 * Multi-turn chat: maps a conversation transcript to LangChain Human/AI messages
 * (preserving roles) and invokes the selected model. Used by the canvas chat
 * node so a chat keeps its prior context across turns.
 */
export async function chatTurnsWithModelFromDbAction(
  input: LangChainChatTurnsInput,
): Promise<ActionResult<LangChainChatTestOutput>> {
  try {
    const turns = input.messages
      .map((m) => ({ role: m.role, text: m.text.trim() }))
      .filter((m) => m.text.length > 0);

    if (turns.length === 0) {
      return actionSuccess({ content: "" });
    }

    // Resolve the selected instruction template (if any) into a leading system
    // prompt. Best-effort: a missing/empty template just omits the system turn.
    const instruction = input.instructionId
      ? (await aiInstructionService.getContent(input.instructionId)).trim()
      : "";

    // A spawned "Ask AI" node carries a brief of the chat/note it came from;
    // inject it as its own system turn so the model has that background.
    const context = input.contextSummary?.trim()
      ? `Context the user's question was carried over from:\n${input.contextSummary.trim()}`
      : "";

    const llm = await getChatModelFromDb(input.modelId);
    const result = await llm.invoke([
      ...(instruction ? [new SystemMessage(instruction)] : []),
      ...(context ? [new SystemMessage(context)] : []),
      ...turns.map((m) =>
        m.role === "ai" ? new AIMessage(m.text) : new HumanMessage(m.text),
      ),
    ]);

    return actionSuccess({ content: normalizeMessageContent(result.content) });
  } catch (error) {
    return actionFailure(error);
  }
}

export type SummarizeContextInput = {
  /** What the content is, so the summary prompt can be tailored. */
  kind: ContextSummaryKind;
  /** The source content (a joined chat transcript or a note's text). */
  content: string;
  /** Model used only if no active OpenAI chat key exists for gpt-4o-mini. */
  fallbackModelId: string;
};

/**
 * Summarize a chat transcript or note into a short context brief for a spawned
 * "Ask AI" node. Always succeeds with a string — best-effort summarization
 * degrades to `""` (no context), so a failure never blocks the spawn.
 */
export async function summarizeContextAction(
  input: SummarizeContextInput,
): Promise<ActionResult<{ summary: string }>> {
  try {
    const summary = await contextSummaryService.summarize(
      input.kind,
      input.content,
      input.fallbackModelId,
    );
    return actionSuccess({ summary });
  } catch (error) {
    return actionFailure(error);
  }
}

export type SummarizeChatNodeInput = {
  /** Chat model to summarize with — the one picked in the canvas toolbar. */
  modelId: string;
  /** Optional AI instruction template id (toolbar pick) — its content becomes
   *  the system prompt; when absent a default summarize system prompt is used. */
  instructionId?: string | null;
  /** The chat transcript to summarize (joined "User:/AI:" lines). */
  transcript: string;
};

/** Default system prompt when the toolbar has no AI instruction selected. */
const SUMMARIZE_CHAT_SYSTEM_PROMPT = `You are a helpful assistant that summarizes a conversation into clear, well-structured notes. Capture the key points, decisions, and any facts worth keeping. Use Markdown (short headings, bold, and bullet lists where it helps). Do not add a preamble — output only the summary.`;

/** Always-on language guard. Sent as its own system turn AFTER any selected
 *  instruction so the summary stays in the conversation's language even when the
 *  picked instruction is written in (or asks for) another language. */
const SUMMARIZE_LANGUAGE_DIRECTIVE = `Write the entire summary in the same language as the conversation being summarized. Detect the conversation's dominant language and respond only in that language — never translate it to another language.`;

/**
 * Summarize an "Ask AI" (chat) node's transcript into a Markdown note, using the
 * model and instruction selected in the canvas toolbar. The selected instruction
 * (if any) drives the system prompt; otherwise a default summarize prompt is used.
 * Unlike {@link summarizeContextAction}, this honors the user's model/instruction
 * choice and surfaces failures (the caller keeps the chat node intact on error).
 */
export async function summarizeChatNodeAction(
  input: SummarizeChatNodeInput,
): Promise<ActionResult<{ summary: string }>> {
  try {
    const transcript = input.transcript.trim();
    if (!transcript) {
      return actionSuccess({ summary: "" });
    }

    const instruction = input.instructionId
      ? (await aiInstructionService.getContent(input.instructionId)).trim()
      : "";
    const system = instruction || SUMMARIZE_CHAT_SYSTEM_PROMPT;

    const llm = await getChatModelFromDb(input.modelId);
    const result = await llm.invoke([
      new SystemMessage(system),
      new SystemMessage(SUMMARIZE_LANGUAGE_DIRECTIVE),
      new HumanMessage(
        `Summarize this conversation, writing the summary in the same language as the conversation:\n\n${transcript}`,
      ),
    ]);

    return actionSuccess({ summary: normalizeMessageContent(result.content).trim() });
  } catch (error) {
    return actionFailure(error);
  }
}

async function resolveActiveEmbeddingModel(): Promise<{ id: number; modelId: string }> {
  const active = await modelRepository.findActive();
  const embedding = active.find((m) => m.type === "embedding");
  if (!embedding) {
    throw new Error("No embedding model found. Add an embedding model with an API key first.");
  }
  return { id: embedding.id, modelId: embedding.modelId };
}

export async function chatWithRagFromDbAction(
  input: LangChainRagChatInput,
): Promise<ActionResult<LangChainRagChatOutput>> {
  try {
    const prompt = input.prompt.trim();
    if (!prompt) {
      return actionSuccess({ content: "", contextChunks: [] });
    }

    const ragIdsNumeric = input.ragIds
      .map((id) => Number(id))
      .filter((n) => Number.isInteger(n) && n > 0);

    const topK = Math.min(Math.max(input.topK ?? 8, 1), 20);

    let contextChunks: LangChainRagChatOutput["contextChunks"] = [];

    if (ragIdsNumeric.length > 0) {
      const embeddingModel = await resolveActiveEmbeddingModel();
      const embeddings = await getEmbeddingsFromDb(embeddingModel.id, {
        model: embeddingModel.modelId,
      });

      // Multi-query retrieval: search the original query plus a few alternative
      // phrasings, then fuse the ranked lists with RRF to widen recall. Expansion
      // is best-effort — an empty list degrades to searching the original alone.
      const expansions = await queryExpansionService.expandQuery(prompt, input.modelId);
      const queries = [prompt, ...expansions];

      const vectors = await embeddings.embedDocuments(queries);

      const searches = await Promise.allSettled(
        vectors.map((vector) =>
          ragChunkRepository.findSimilarByRagIds(ragIdsNumeric, vector ?? [], topK),
        ),
      );

      // Reciprocal Rank Fusion: a chunk surfacing across multiple phrasings (or
      // high in any one) ranks higher. Only rank is needed, which the repo gives us.
      const fused = new Map<
        number,
        { score: number; chunk: Awaited<ReturnType<typeof ragChunkRepository.findSimilarByRagIds>>[number] }
      >();
      for (const search of searches) {
        if (search.status !== "fulfilled") continue;
        search.value.forEach((chunk, rank) => {
          const contribution = 1 / (RRF_K + rank + 1);
          const existing = fused.get(chunk.id);
          if (existing) existing.score += contribution;
          else fused.set(chunk.id, { score: contribution, chunk });
        });
      }

      contextChunks = [...fused.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(({ chunk: c }) => ({
          ragId: String(c.ragId),
          chunkId: String(c.id),
          content: c.content,
          metadata: (c.metadata ?? null) as Record<string, unknown> | null,
        }));
    }

    // Images live in the source documents but chunking can drop the `![](...)`
    // markdown, so resolve them from the source docs and offer them to the model
    // with an instruction to embed the relevant ones inline (exact paths).
    const sourceImages =
      contextChunks.length > 0 ? await resolveSourceImages(contextChunks) : [];

    const imagesBlock =
      sourceImages.length > 0
        ? [
            "",
            "Available images from the source documents. When the answer refers to",
            "screenshots or images, embed the relevant ones inline at the right place",
            "(e.g. in place of a 'Screenshots:' list) using this EXACT Markdown — do",
            "not alter or invent paths, and only include images that are relevant:",
            ...sourceImages.map((img) => `![${img.alt || "Image"}](${img.src})`),
          ]
        : [];

    const contextBlock =
      contextChunks.length > 0
        ? [
            "Use the following context to answer. If the context is not relevant, answer normally.",
            "",
            ...contextChunks.map(
              (c, i) =>
                `[#${i + 1} rag:${c.ragId} chunk:${c.chunkId}]\n${c.content}`,
            ),
            ...imagesBlock,
            "",
            "User question:",
            prompt,
          ].join("\n")
        : prompt;

    const instruction = input.instructionId
      ? (await aiInstructionService.getContent(input.instructionId)).trim()
      : "";

    const llm = await getChatModelFromDb(input.modelId);
    const result = await llm.invoke(
      instruction
        ? [new SystemMessage(instruction), new HumanMessage(contextBlock)]
        : contextBlock,
    );

    return actionSuccess({
      content: normalizeMessageContent(result.content),
      contextChunks,
    });
  } catch (error) {
    return actionFailure(error);
  }
}

export type LangChainEmbeddingsInput = {
  modelId: string;
  texts: string[];
};

export type LangChainEmbeddingsOutput = {
  vectors: number[][];
};

export async function embedTextsFromDbAction(
  input: LangChainEmbeddingsInput,
): Promise<ActionResult<LangChainEmbeddingsOutput>> {
  try {
    const texts = input.texts.map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) {
      return actionSuccess({ vectors: [] });
    }

    const embeddings = await getEmbeddingsFromDb(input.modelId);
    const vectors = await embeddings.embedDocuments(texts);

    return actionSuccess({ vectors });
  } catch (error) {
    return actionFailure(error);
  }
}

