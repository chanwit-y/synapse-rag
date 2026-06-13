import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { db } from "../index";
import type * as schema from "../schema";

export type Database = BunSQLiteDatabase<typeof schema>;

export function resolveDb(database?: Database): Database {
  return database ?? db;
}
