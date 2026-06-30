import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  ragChunkStrategyValues,
  ragMethodValues,
  ragSizingUnitValues,
  ragStatusValues,
} from "./enums";
import { models } from "./models";

export const rags = sqliteTable("rags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  method: text("method", { enum: ragMethodValues })
    .notNull()
    .default("semantic"),
  chunkStrategy: text("chunk_strategy", { enum: ragChunkStrategyValues })
    .notNull()
    .default("fixed"),
  /** Whether chunkSize/chunkOverlap are counted in characters or real tokens. */
  sizingUnit: text("sizing_unit", { enum: ragSizingUnitValues })
    .notNull()
    .default("chars"),
  chunkSize: integer("chunk_size").notNull().default(512),
  chunkOverlap: integer("chunk_overlap").notNull().default(50),
  /**
   * Ordered separators for the `custom` strategy, JSON-encoded `string[]`
   * (a leading `re:` marks a regex). Null for other strategies.
   */
  customSeparators: text("custom_separators"),
  /**
   * Percentile (1–99) of consecutive-sentence distance at which the `semantic`
   * method starts a new chunk. Null ⇒ use the default (95).
   */
  semanticThreshold: integer("semantic_threshold"),
  embeddingModel: text("embedding_model"),
  includeMetadata: integer("include_metadata", { mode: "boolean" })
    .notNull()
    .default(true),
  chunkCount: integer("chunk_count").notNull().default(0),
  status: text("status", { enum: ragStatusValues })
    .notNull()
    .default("processing"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Rag = typeof rags.$inferSelect;
export type NewRag = typeof rags.$inferInsert;
