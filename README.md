# Synapse Rumi

Next.js app with SQLite ([sqlite-vec](https://github.com/asg017/sqlite-vec) for vector search) and [Drizzle ORM](https://orm.drizzle.team/).

## Prerequisites

- [Bun](https://bun.sh/) (required; the app runs on `bun:sqlite`)
- macOS only: a non-Apple SQLite build for loading the sqlite-vec extension
  (`brew install sqlite`). Apple's bundled SQLite disables extension loading.

## Quick start

Install dependencies:

```bash
bun install
```

Configure environment:

```bash
cp .env.example .env
```

Apply migrations (creates `./.data/synapse-rag.db`):

```bash
mkdir -p .data
bun run db:migrate
```

Run the app:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database (SQLite + sqlite-vec)

### Connection

The database is a local SQLite file. `.env.example` sets:

```
DATABASE_URL=./.data/synapse-rag.db
# macOS only, defaults to the Homebrew build:
# SQLITE_LIB_PATH=/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib
```

The client (`src/server/db/index.ts`) opens the file with `bun:sqlite`,
enables WAL and foreign keys, and loads the sqlite-vec extension. RAG chunk
embeddings are stored as float32 BLOBs and similarity search uses
`vec_distance_l2()` (see `RagChunkRepository.findSimilarByRagIds`).

Delete `./.data` to start from a fresh database.

### Schema overview

Drizzle schemas live in `src/server/db/schema/`. Tables and relationships:

```
collections (1) ──< items (N)
                      │
                      ├── folder_id → items (self-reference, folder tree)
                      ├──< histories (N)     version snapshots per item
                      └──<> rags (M:N via item_rags)

api_keys (1) ──< models (N) ──< rags (N) ──< rag_chunks (N)
                                    │
                                    └──<> items (M:N via item_rags)
```

| Table         | Purpose |
| ------------- | ------- |
| `collections` | Top-level document groups |
| `items`       | Files and folders (`type`: `file` \| `folder`); optional `folder_id` for nesting |
| `histories`   | Content history rows per item |
| `api_keys`    | Provider API credentials (`key_value`, `key_masked`, `provider`, `status`) |
| `models`      | LLM configs; optional `api_key_id` |
| `rags`        | RAG pipelines; requires `model_id` |
| `rag_chunks`  | Chunked content + float32 embedding BLOBs for vector search |
| `item_rags`   | Junction: which items belong to which RAG configs |

Relations for `db.query.*` are defined in `src/server/db/schema/relations.ts`.

### Project layout

```
src/server/db/
├── index.ts              # db client (import from @/server/db)
├── schema/
│   ├── collections.ts
│   ├── items.ts
│   ├── histories.ts
│   ├── api-keys.ts
│   ├── models.ts
│   ├── rags.ts
│   ├── rag-chunks.ts
│   ├── item-rags.ts
│   ├── relations.ts
│   ├── enums.ts
│   └── index.ts
└── migrations/           # generated SQL (commit these)
drizzle.config.ts         # Drizzle Kit config (reads DATABASE_URL via dotenv)
```

### Drizzle commands

Run from the project root with `.env` present:

| Command | When to use |
| ------- | ----------- |
| `bun run db:migrate` | Apply committed migrations (preferred for local/prod) |
| `bun run db:generate` | After changing schema TS files, create a new migration SQL file |
| `bun run db:push` | Push schema directly without migration files (quick local experiments only) |
| `bun run db:studio` | Open [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) at a local URL to browse/edit data |

Typical workflow when you change a schema file:

```bash
bun run db:generate   # writes src/server/db/migrations/XXXX_*.sql
bun run db:migrate    # applies it to the database
```

### Using the database in code

```ts
import { db } from "@/server/db";
import { items, collections } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Insert
await db.insert(collections).values({ name: "My collection" });

// Query with relations
const collection = await db.query.collections.findFirst({
  where: eq(collections.id, 1),
  with: {
    items: {
      with: { histories: true, rags: { with: { rag: true } } },
    },
  },
});
```

Server-only: import `db` from API routes, Server Actions, or other server code — not from Client Components.

## Scripts

| Script | Description |
| ------ | ----------- |
| `bun run dev` | Next.js dev server |
| `bun run build` | Production build |
| `bun run start` | Run production server |
| `bun run lint` | ESLint |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:generate` | Generate migration from schema |
| `bun run db:push` | Sync schema to DB (dev shortcut) |
| `bun run db:studio` | Drizzle Studio UI |

Synapse#2026
