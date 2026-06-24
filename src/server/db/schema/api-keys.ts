import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { activeStatusValues, apiKeyProviderValues } from "./enums";

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  keyValue: text("key_value").notNull(),
  keyMasked: text("key_masked").notNull(),
  /**
   * OpenAI-compatible base URL for providers that need one (Microsoft Foundry,
   * e.g. `https://<resource>.services.ai.azure.com/openai/v1`). Null for
   * providers that talk to a fixed/global endpoint.
   */
  endpoint: text("endpoint"),
  /**
   * Azure `api-version` query param sent on every request (Microsoft Foundry).
   * Resource/region-specific (e.g. `2024-10-21`, `2025-01-01-preview`). Null for
   * providers that don't need it.
   */
  apiVersion: text("api_version"),
  provider: text("provider", { enum: apiKeyProviderValues })
    .notNull()
    .default("other"),
  status: text("status", { enum: activeStatusValues })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
