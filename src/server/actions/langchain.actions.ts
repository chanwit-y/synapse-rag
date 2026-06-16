"use server";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  aiInstructionService,
  getChatModelFromDb,
  getEmbeddingsFromDb,
} from "@/server/services";
import { modelRepository, ragChunkRepository } from "@/server/db/repository";
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

export type LangChainRagChatOutput = {
  content: string;
  contextChunks: Array<{
    ragId: string;
    chunkId: string;
    content: string;
    metadata: Record<string, unknown> | null;
  }>;
};

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

    const contextBlock =
      contextChunks.length > 0
        ? [
            "Use the following context to answer. If the context is not relevant, answer normally.",
            "",
            ...contextChunks.map(
              (c, i) =>
                `[#${i + 1} rag:${c.ragId} chunk:${c.chunkId}]\n${c.content}`,
            ),
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

