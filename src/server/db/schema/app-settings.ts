import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { models } from "./models";

/**
 * Generic key/value store for singleton app settings. Each row is one setting,
 * keyed by a stable string. `modelId` references a {@link models} row when the
 * setting points at a model (e.g. the background chat model); deleting that
 * model clears the setting (`set null`) so the consumer falls back gracefully.
 */
export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  modelId: integer("model_id").references(() => models.id, {
    onDelete: "set null",
  }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
