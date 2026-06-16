import { asc, eq } from "drizzle-orm";
import {
  aiInstructions,
  type AiInstruction,
  type NewAiInstruction,
} from "../schema/ai-instructions";
import { type Database, resolveDb } from "./base";

export class AiInstructionRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.aiInstructions.findFirst({
      where: eq(aiInstructions.id, id),
    });
  }

  findAll() {
    return this.database.query.aiInstructions.findMany({
      orderBy: asc(aiInstructions.name),
    });
  }

  findActive() {
    return this.database.query.aiInstructions.findMany({
      where: eq(aiInstructions.status, "active"),
      orderBy: asc(aiInstructions.name),
    });
  }

  create(data: NewAiInstruction) {
    return this.database
      .insert(aiInstructions)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewAiInstruction, "id">>) {
    return this.database
      .update(aiInstructions)
      .set(data)
      .where(eq(aiInstructions.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(aiInstructions)
      .where(eq(aiInstructions.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const aiInstructionRepository = new AiInstructionRepository();

export type { AiInstruction, NewAiInstruction };
