import { and, asc, eq } from "drizzle-orm";
import { models, type Model, type NewModel } from "../schema/models";
import { type Database, resolveDb } from "./base";

export class ModelRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.models.findFirst({
      where: eq(models.id, id),
    });
  }

  findAll() {
    return this.database.query.models.findMany({
      with: { apiKey: true },
      orderBy: asc(models.name),
    });
  }

  findActive() {
    return this.database.query.models.findMany({
      where: eq(models.status, "active"),
      orderBy: asc(models.name),
    });
  }

  findByType(type: Model["type"]) {
    return this.database.query.models.findMany({
      where: eq(models.type, type),
      with: { apiKey: true },
      orderBy: asc(models.name),
    });
  }

  findByApiKeyId(apiKeyId: number) {
    return this.database.query.models.findMany({
      where: eq(models.apiKeyId, apiKeyId),
      orderBy: asc(models.name),
    });
  }

  findDefault() {
    return this.database.query.models.findFirst({
      where: and(eq(models.isDefault, true), eq(models.status, "active")),
    });
  }

  findWithRags(id: number) {
    return this.database.query.models.findFirst({
      where: eq(models.id, id),
      with: { apiKey: true, rags: true },
    });
  }

  create(data: NewModel) {
    return this.database
      .insert(models)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewModel, "id">>) {
    return this.database
      .update(models)
      .set(data)
      .where(eq(models.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(models)
      .where(eq(models.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const modelRepository = new ModelRepository();

export type { Model, NewModel };
