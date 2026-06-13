import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { activeStatusValues, apiKeyProviderValues } from "./enums";

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  keyValue: text("key_value").notNull(),
  keyMasked: text("key_masked").notNull(),
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
