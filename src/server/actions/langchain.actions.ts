"use server";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  aiInstructionService,
  getChatModelFromDb,
  getEmbeddingsFromDb,
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
      const [queryVector] = await embeddings.embedDocuments([prompt]);

      const chunks = await ragChunkRepository.findSimilarByRagIds(
        ragIdsNumeric,
        queryVector ?? [],
        topK,
      );

      contextChunks = chunks.map((c) => ({
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

