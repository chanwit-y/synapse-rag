import { asc, eq } from "drizzle-orm";
import { rags, type NewRag, type Rag } from "../schema/rags";
import { type Database, resolveDb } from "./base";

export class RagRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.rags.findFirst({
      where: eq(rags.id, id),
    });
  }

  findAll() {
    return this.database.query.rags.findMany({
      orderBy: asc(rags.name),
    });
  }

  findByModelId(modelId: number) {
    return this.database.query.rags.findMany({
      where: eq(rags.modelId, modelId),
      orderBy: asc(rags.name),
    });
  }

  findWithItems(id: number) {
    return this.database.query.rags.findFirst({
      where: eq(rags.id, id),
      with: {
        model: true,
        items: { with: { item: true } },
      },
    });
  }

  create(data: NewRag) {
    return this.database
      .insert(rags)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewRag, "id">>) {
    return this.database
      .update(rags)
      .set(data)
      .where(eq(rags.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(rags)
      .where(eq(rags.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const ragRepository = new RagRepository();

export type { Rag, NewRag };
