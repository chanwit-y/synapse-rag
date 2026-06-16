import type {
  AiInstructionFormValues,
  AiInstructionRecord,
} from "@/components/container/ai-instruction/types";
import {
  aiInstructionRepository,
  type NewAiInstruction,
} from "@/server/db/repository";
import { toAiInstructionRecord } from "./mappers";
import { assertFound, parseId, ServiceError } from "./utils";

export class AiInstructionService {
  async list(): Promise<AiInstructionRecord[]> {
    const rows = await aiInstructionRepository.findAll();
    return rows.map(toAiInstructionRecord);
  }

  /** Active templates only — used to populate the chat instruction picker. */
  async listActive(): Promise<AiInstructionRecord[]> {
    const rows = await aiInstructionRepository.findActive();
    return rows.map(toAiInstructionRecord);
  }

  /** Resolve a template's content for use as a system prompt. */
  async getContent(id: string): Promise<string> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid instruction id", "VALIDATION");
    }
    const row = await aiInstructionRepository.findById(numericId);
    return assertFound(row, "Instruction template not found").content ?? "";
  }

  async create(values: AiInstructionFormValues): Promise<AiInstructionRecord> {
    const name = values.name.trim();
    if (!name) {
      throw new ServiceError("Name is required", "VALIDATION");
    }

    const row = await aiInstructionRepository.create({
      name,
      description: values.description.trim(),
      content: values.content,
      status: values.active ? "active" : "inactive",
    });

    return toAiInstructionRecord(assertFound(row, "Failed to create instruction"));
  }

  async update(
    id: string,
    values: AiInstructionFormValues,
  ): Promise<AiInstructionRecord> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid instruction id", "VALIDATION");
    }

    const name = values.name.trim();
    if (!name) {
      throw new ServiceError("Name is required", "VALIDATION");
    }

    const patch: Partial<Omit<NewAiInstruction, "id">> = {
      name,
      description: values.description.trim(),
      content: values.content,
      status: values.active ? "active" : "inactive",
    };

    const row = await aiInstructionRepository.update(numericId, patch);
    return toAiInstructionRecord(assertFound(row, "Instruction template not found"));
  }

  async remove(id: string): Promise<void> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid instruction id", "VALIDATION");
    }

    const row = await aiInstructionRepository.delete(numericId);
    assertFound(row, "Instruction template not found");
  }
}

export const aiInstructionService = new AiInstructionService();
