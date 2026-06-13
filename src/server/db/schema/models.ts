import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { apiKeys } from "./api-keys";
import {
  activeStatusValues,
  modelProviderValues,
  modelTypeValues,
} from "./enums";

export const models = sqliteTable("models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  provider: text("provider", { enum: modelProviderValues }).notNull(),
  modelId: text("model_id").notNull(),
  type: text("type", { enum: modelTypeValues }).notNull().default("chat"),
  contextWindow: integer("context_window"),
  temperature: real("temperature"),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
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

export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
