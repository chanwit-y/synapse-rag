# syntax=docker/dockerfile:1

# ── Builder ────────────────────────────────────────────────────────────────
# Installs all deps (incl. drizzle-kit for migrations) and builds Next.js.
FROM oven/bun:1.2.20 AS builder
WORKDIR /app

# Native deps: better-sqlite3 (used by drizzle-kit) may need to compile if no
# prebuilt binary matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the app. DATABASE_URL is set to a throwaway path because importing the
# server db module opens a SQLite file at import time during route collection.
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=/tmp/build.db
RUN bun run build

# ── Runner ─────────────────────────────────────────────────────────────────
FROM oven/bun:1.2.20 AS runner
WORKDIR /app
ENV NODE_ENV=production
# SQLite file lives here; mount a volume on this path to persist data.
ENV DATABASE_URL=/app/.data/synapse-rag.db
ENV PORT=3000

# Copy the built app and installed modules from the builder.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Persist the SQLite database (and WAL files) outside the image layer.
RUN mkdir -p /app/.data && chmod +x /usr/local/bin/docker-entrypoint.sh
VOLUME ["/app/.data"]

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
