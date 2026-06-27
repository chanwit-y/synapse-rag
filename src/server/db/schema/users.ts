import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { activeStatusValues } from "./enums";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Login identifier — normalized to lowercase, unique. */
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  /** argon2id hash produced by `Bun.password`. Never sent to the client. */
  passwordHash: text("password_hash").notNull(),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
