#!/bin/sh
set -e

# Apply any pending migrations before the server accepts traffic.
echo "→ Running database migrations…"
bun run db:migrate

echo "→ Starting Next.js on port ${PORT:-3000}…"
exec bun run start
