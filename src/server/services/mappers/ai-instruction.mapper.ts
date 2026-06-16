import type { AiInstructionRecord } from "@/components/container/ai-instruction/types";
import type { AiInstruction } from "@/server/db/repository";
import { toIdString, toIsoString } from "../utils";

export function toAiInstructionRecord(row: AiInstruction): AiInstructionRecord {
  return {
    id: toIdString(row.id),
    name: row.name,
    description: row.description,
    content: row.content,
    status: row.status,
    updatedAt: toIsoString(row.updatedAt),
  };
}
