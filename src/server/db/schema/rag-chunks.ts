import {
  customType,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { rags } from "./rags";

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Embedding vector stored as a float32 BLOB, the format sqlite-vec
 * functions (vec_distance_l2, vec_distance_cosine, ...) operate on.
 */
const float32Vector = customType<{
  data: number[];
  driverData: Uint8Array;
}>({
  dataType() {
    return "blob";
  },
  toDriver(value) {
    return new Uint8Array(new Float32Array(value).buffer);
  },
  fromDriver(value) {
    const bytes = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    return Array.from(
      new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4),
    );
  },
});

/**
 * Data chunks for RAG retrieval.
 *
 * Note: similarity search uses sqlite-vec; ensure the extension is loaded.
 */
export const ragChunks = sqliteTable(
  "rag_chunks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ragId: integer("rag_id")
      .notNull()
      .references(() => rags.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    tokenCount: integer("token_count"),
    embedding: float32Vector("embedding"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique().on(table.ragId, table.chunkIndex),
    index("rag_chunks_rag_id_idx").on(table.ragId),
  ],
);

export type RagChunk = typeof ragChunks.$inferSelect;
export type NewRagChunk = typeof ragChunks.$inferInsert;
