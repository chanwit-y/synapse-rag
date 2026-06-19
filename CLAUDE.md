# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `bun run dev` - Start Next.js dev server (uses `bunx --bun next dev`)
- `bun run build` - Create production build
- `bun run start` - Run production server
- `bun run lint` - Run ESLint

### Database (Drizzle + SQLite)
- `bun run db:generate` - Generate migration SQL from schema changes
- `bun run db:migrate` - Apply committed migrations to the database
- `bun run db:push` - Push schema directly to the database (dev only)
- `bun run db:studio` - Open Drizzle Studio

## Environment

Copy `.env.example` to `.env`:
- `DATABASE_URL` - Path to the SQLite file (e.g. `./.data/synapse-rumi.db`). A `file:` prefix is stripped automatically; `:memory:` is supported.
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` - Per-provider **fallback** keys. A model normally uses the API key linked to it in the DB; these env vars are only used when no key is linked (see `src/server/services/llm`).
- `AZURE_ORG` (required for the Azure import feature) plus optional `AZURE_PROJECT` / `AZURE_TEAM` defaults. The Azure DevOps **PAT is not an env var** — it's stored in the DB as an API key with provider `Azure DevOps` (the single active key for that provider is used at request time).
- `SQLITE_LIB_PATH` *(macOS only, optional)* - Path to a non-Apple `libsqlite3`. See the SQLite note below.

There is **no Docker / PostgreSQL**. The database is a local SQLite file created on first run (`db:migrate` or starting the app).

### macOS SQLite gotcha
The app uses Bun's native `bun:sqlite` driver and loads the **`sqlite-vec`** extension for vector search. Apple's system SQLite (what Bun links on macOS) blocks extension loading, so `src/server/db/index.ts` calls `Database.setCustomSQLite()` pointing at Homebrew's build (default `/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib`). Override via `SQLITE_LIB_PATH` if yours lives elsewhere. On startup the DB enables WAL mode, foreign keys, and loads `sqlite-vec`.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Database**: SQLite via `bun:sqlite` + Drizzle ORM, with `sqlite-vec` for vector search
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Package Manager**: Bun
- **LLM**: LangChain, multi-provider — `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai` (chat + embeddings)
- **Notable UI deps**: `@uiw/react-md-editor` (markdown editor), `react-markdown`/`remark-gfm` (chat markdown), `@tanstack/react-table` (DataTable), `lucide-react` (icons), `diff` (DiffViewer), `rehype-katex`/`remark-math` (math rendering), `mermaid` (diagram rendering), `sigma`/`graphology` (Document graph view), `@dnd-kit` (drag-and-drop)

### Server layering (data flow)
Request flow is strictly layered — **never skip a layer**:

```
Server Component / Client (server action call)
  → src/server/actions/   "use server" entry points; wrap results in ActionResult<T>
    → src/server/services/ business logic (classes, e.g. RagService); throw ServiceError
      → src/server/db/repository/ data access (Drizzle queries)
        → src/server/db/   Drizzle client + schema
```

- **Actions** (`src/server/actions/*.actions.ts`) are `"use server"` and return a discriminated `ActionResult<T>` (`{ success: true, data } | { success: false, error }`). Use the `actionSuccess` / `actionFailure` helpers from `actions/types.ts`. Callers unwrap with a local `unwrapAction` helper.
- **Services** hold business logic and convert DB rows into client-facing view models using **mappers** in `src/server/services/mappers/`. Shared helpers (`assertFound`, `parseId`, `ServiceError`) live in `services/utils.ts`.
- **Repositories** are the only place that touches Drizzle queries; extend `repository/base.ts`.
- Import the DB client and schema from `@/server/db`.

**LLM connector** (`src/server/services/llm/`): provider-agnostic, Strategy + Registry pattern. `getChatModelFromDb(modelId)` / `getEmbeddingsFromDb(modelId)` resolve a model's provider + linked API key from the DB and return a LangChain `BaseChatModel` / `Embeddings`, so callers use a uniform `.invoke()` / `.embedDocuments()` regardless of provider. Add a provider by writing a strategy in `llm/providers/` and registering it in `llm/registry.ts`. Anthropic has no embeddings API (use OpenAI/Google for embedding models). `langchain-openai.ts` is a deprecated back-compat shim.

**Azure DevOps import** (`src/server/services/azure/`): pulls work-item trees (epics → children → user stories) from Azure DevOps and imports selected user stories as `items` (with version `histories`) under a `collection`. `client.ts` handles auth (resolves the active `Azure DevOps` API key from the DB as a PAT), the REST/WIQL/batch calls, and attachment download; `azure.service.ts` converts work-item HTML descriptions to markdown with `turndown` and rewrites/saves attachments locally. Exposed via `azure.actions.ts` and consumed on the Document page.

**Vector search**: RAG chunk embeddings are stored as float32 BLOBs; similarity uses `vec_distance_l2()` (see `RagChunkRepository.findSimilarByRagIds`).

**Multi-query retrieval** (`query-expansion.service.ts`): before searching, `QueryExpansionService.expandQuery()` asks an LLM (prefers OpenAI `gpt-4o-mini` via the active OpenAI chat key, else the caller's selected model) for alternative phrasings of the question, then the chat flow searches all phrasings and fuses results with Reciprocal Rank Fusion (RRF). Best-effort: any failure (missing key, provider error, 8s timeout, garbage output) degrades silently to searching the original query alone.

**AI instruction templates** (`ai-instruction.service.ts` → `ai_instructions` table): reusable, named system-prompt templates with active/inactive status. Active templates populate the chat instruction picker; the selected template's `content` is resolved (`getContent`) and used as the chat system prompt. Managed under the `settings/ai-instruction` route.

**Document graph view** (`container/document/DocumentGraphView.tsx`): a Sigma/graphology force-directed (ForceAtlas2) graph of the collection → folder → file hierarchy across all collections. Theme-aware; collection/folder nodes collapse/expand on click, file nodes open in the editor. Toggled from the file sidebar header (next to the add-collection button); the chosen mode is persisted in the Zustand layout store. Lazy-loaded with `next/dynamic` (`ssr: false`) since it renders to WebGL/canvas. **Gotcha:** never write a ref during render (React Compiler rule `react-hooks/refs`) — keep "latest prop" refs in sync via `useEffect`.

### Database schema
Located in `src/server/db/schema/` (one file per table, re-exported from `index.ts`; relations in `relations.ts`, shared enums in `enums.ts`):

- `collections` → `items` (one-to-many)
- `items` self-reference for folder hierarchy (`folder_id`)
- `items` → `histories` (one-to-many, document version tracking)
- `items` → `canvas_chat_messages` (one-to-many; live transcript of a canvas chat node, keyed by item + node id. The canvas graph JSON holds node structure only — chat messages are persisted here per-turn, hydrated on open, GC'd on save.)
- `items` ↔ `rags` (many-to-many via `item_rags`)
- `rags` → `rag_chunks` (embedded chunks for vector search via `sqlite-vec`)
- `api_keys` → `models` → `rags` (dependency chain)
- `ai_instructions` (standalone) — named system-prompt templates for the chat picker

Migrations are generated into `src/server/db/migrations/`.

### Project structure
```
src/
├── app/                    # App Router routes (analytics, document, rag, settings/{ai-instruction,ai-model,api-key}, users)
│                           #   pages are async Server Components; add loading.tsx for route-level skeletons
├── components/
│   ├── common/             # Reusable UI primitives — each in its own folder with an index file
│   │                       #   (Button, DataTable, MarkdownEditor, FileTree, Modal, ChatMarkdown, DiffViewer,
│   │                       #    DatePicker, SelectField, Autocomplete, Drawer, Snackbar, Typography, ...)
│   ├── container/          # Feature page content (home, document, rag, api-key, ai-model, ai-instruction); each has its own types.ts
│   │                       #   document/ holds DocumentPageContent, AzureImportModal, DocumentGraphView (Sigma)
│   ├── layout/             # App shell (AppBar, Sidebar, MobileSidebar, LayoutProvider, ThemeToggle, nav-items)
│   ├── context/            # React context providers
│   └── hook/               # Component-scoped hooks (barrel)
├── hooks/                  # App-wide React hooks (e.g. useApiLoading)
├── server/
│   ├── actions/            # Server Actions ("use server") — ActionResult<T> contract
│   ├── api/                # API helpers
│   ├── services/           # Business logic (+ mappers/, llm/, azure/, query-expansion, ai-instruction)
│   └── db/
│       ├── schema/         # Drizzle table definitions
│       ├── migrations/     # Generated SQL migrations
│       ├── repository/     # Data access layer
│       └── index.ts        # Drizzle client (bun:sqlite + sqlite-vec)
├── store/                  # Zustand stores (layout-store)
├── util/                   # Utilities (const/, extension/)
└── asset/                  # Static images (logos, etc.)
```

### Key conventions

**Components**
- Common UI primitives live in `src/components/common/<Name>/` with an `index` file; feature-specific content lives in `src/components/container/<feature>/` with a co-located `types.ts`.
- Server Components fetch data and pass it as `initial*` props to a client container (e.g. `DocumentPage` → `DocumentPageContent`).

**Loading / async UX**
- Route transitions: add a `loading.tsx` next to a page (skeletons live in `src/components/common/Skeleton`, e.g. `TableSkeleton`).
- In-page async actions: use the `useApiLoading` hook (`src/hooks`) with `ApiLoadingBackdrop`; it enforces a minimum loader display to avoid flicker.

**Path alias**
- `@/*` maps to `./src/*`.

## Skills

### grill-me
Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. **Trigger** when the user wants to stress-test a plan, get grilled on their design, or says "grill me".

When invoked:
- Interview the user relentlessly about every aspect of the plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one at a time.
- If a question can be answered by exploring the codebase, explore the codebase instead of asking.
- For each question, provide your recommended answer.

_Source: ["My 'grill-me' skill has gone viral"](https://www.aihero.dev/my-grill-me-skill-has-gone-viral)._

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->