import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as sqliteVec from "sqlite-vec";

// Applies committed Drizzle migrations using Bun's native `bun:sqlite` driver
// (the same one the app runs on). This intentionally avoids `drizzle-kit
// migrate`, which drives migrations through Node + the `better-sqlite3` native
// addon — a binary that breaks with an ABI mismatch inside the Bun container.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const databasePath = databaseUrl.replace(/^file:/, "");

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

const db = drizzle(sqlite);
const migrationsFolder = join(import.meta.dir, "../src/server/db/migrations");

console.log(`→ Applying migrations from ${migrationsFolder}`);
migrate(db, { migrationsFolder });
console.log("✓ Migrations applied");

sqlite.close();
