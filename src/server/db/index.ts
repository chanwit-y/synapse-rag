import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as sqliteVec from "sqlite-vec";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const databasePath = databaseUrl.replace(/^file:/, "");

const globalForDb = globalThis as unknown as {
  sqlite: Database | undefined;
};

function openDatabase(): Database {
  // Apple's system SQLite (the one Bun links on macOS) blocks extension
  // loading, so sqlite-vec needs a Homebrew/custom libsqlite3 instead.
  if (process.platform === "darwin") {
    Database.setCustomSQLite(
      process.env.SQLITE_LIB_PATH ??
        "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib",
    );
  }

  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const sqlite = new Database(databasePath, { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqliteVec.load(sqlite);
  return sqlite;
}

const sqlite = globalForDb.sqlite ?? openDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export * from "./schema";
