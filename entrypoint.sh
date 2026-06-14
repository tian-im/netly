#!/bin/sh
set -e

# ─────────────────────────────────────────────────────────────
# Netly Ledger — Production Entrypoint
#
# 1. Creates /app/data (mounted volume) if missing
# 2. Auto-generates or reads the session secret, then exports
#    it as SESSION_SECRET so Edge Runtime (middleware) can use it
# 3. Generates Prisma client for the runtime platform
#    (skip with SKIP_PRISMA_GENERATE=1)
# 4. Applies pending database migrations (idempotent)
#    (skip with SKIP_MIGRATIONS=1)
# 5. Starts the Next.js standalone server
# ─────────────────────────────────────────────────────────────

# Ensure the data directory exists (mount point for SQLite DB + session secret)
mkdir -p /app/data

# ─── Session Secret ──────────────────────────────────────────
# Export as env var so Edge Runtime (middleware) can read it.
# Node.js code also falls back to the file via session-secret.ts.
#
# Resolution order:
#   1. SESSION_SECRET env var (explicit override, highest precedence)
#   2. SESSION_SECRET_FILE env var → file path
#   3. Default: /app/data/.session-secret (inside the mounted volume)
if [ -z "$SESSION_SECRET" ]; then
  SECRET_FILE="${SESSION_SECRET_FILE:-/app/data/.session-secret}"
  if [ ! -f "$SECRET_FILE" ]; then
    echo "[entrypoint] Generating new session secret at ${SECRET_FILE}..."
    mkdir -p "$(dirname "$SECRET_FILE")"
    node -e "require('fs').writeFileSync('${SECRET_FILE}', require('crypto').randomBytes(32).toString('hex'))"
  fi
  SESSION_SECRET=$(cat "$SECRET_FILE")
  export SESSION_SECRET
  echo "[entrypoint] Session secret loaded from ${SECRET_FILE}"
fi

# ─── Prisma ──────────────────────────────────────────────────

# Generate the Prisma client for the runtime platform.
# This is redundant if the standalone build already traced the generated client
# (the builder stage runs prisma generate). However, it's kept as a safety net
# in case the schema changed between build and deploy, or the traced client
# is missing engine binaries for the runner's architecture.
if [ -z "$SKIP_PRISMA_GENERATE" ]; then
  npx prisma generate
else
  echo "[entrypoint] SKIP_PRISMA_GENERATE is set — skipping prisma generate"
fi

# Apply any pending migrations idempotently.
# This creates the DB schema if it doesn't exist yet, or runs any pending
# migrations. Set SKIP_MIGRATIONS=1 if you manage the schema externally.
if [ -z "$SKIP_MIGRATIONS" ]; then
  npx prisma migrate deploy
else
  echo "[entrypoint] SKIP_MIGRATIONS is set — skipping prisma migrate deploy"
fi

# ─── Start Server ─────────────────────────────────────────────

exec node server.js
