import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { aiInstructionStatusValues } from "./enums";

export const aiInstructions = sqliteTable("ai_instructions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull().default(""),
  status: text("status", { enum: aiInstructionStatusValues })
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

export type AiInstruction = typeof aiInstructions.$inferSelect;
export type NewAiInstruction = typeof aiInstructions.$inferInsert;
