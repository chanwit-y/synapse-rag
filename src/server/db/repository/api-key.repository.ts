import { and, asc, desc, eq } from "drizzle-orm";
import { apiKeys, type ApiKey, type NewApiKey } from "../schema/api-keys";
import type { ApiKeyProvider } from "../schema/enums";
import { type Database, resolveDb } from "./base";

export class ApiKeyRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
    });
  }

  findAll() {
    return this.database.query.apiKeys.findMany({
      orderBy: asc(apiKeys.name),
    });
  }

  findActive() {
    return this.database.query.apiKeys.findMany({
      where: eq(apiKeys.status, "active"),
      orderBy: asc(apiKeys.name),
    });
  }

  /** Active keys for a provider, most-recently-updated first. */
  findActiveByProvider(provider: ApiKeyProvider) {
    return this.database.query.apiKeys.findMany({
      where: and(eq(apiKeys.status, "active"), eq(apiKeys.provider, provider)),
      orderBy: desc(apiKeys.updatedAt),
    });
  }

  findWithModels(id: number) {
    return this.database.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
      with: { models: true },
    });
  }

  create(data: NewApiKey) {
    return this.database
      .insert(apiKeys)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewApiKey, "id">>) {
    return this.database
      .update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const apiKeyRepository = new ApiKeyRepository();

export type { ApiKey, NewApiKey };
