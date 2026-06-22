# ─────────────────────────────────────────────────────────────────
# Netly Ledger — Multi-Stage Production Dockerfile
# ─────────────────────────────────────────────────────────────────
# Build:  docker build -t netly-ledger:latest .
# Run:    docker run -p 3000:3000 -v ./netly-data:/app/data netly-ledger:latest
# ─────────────────────────────────────────────────────────────────

# ─── Stage 1: Install ALL dependencies (including devDeps for build) ───
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ─── Stage 2: Build the application ───
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# WHY: Next.js static page generation during `yarn build` imports PrismaClient
# at module level (src/lib/db.ts). PrismaClient validates DATABASE_URL on
# construction, so it must be set — even though no real DB connection is
# needed at build time. A placeholder value satisfies the validation.
# The runner stage overrides this with the real path (file:/app/data/netly.db).
ENV DATABASE_URL=file:./placeholder.db

# Generate Prisma client so it's available during build (and traced by standalone)
RUN npx prisma generate

# Build Next.js with standalone output
RUN yarn build

# ─── Stage 3: Production runner (minimal) ───
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Default database URL — points to the mounted data volume
ENV DATABASE_URL=file:/app/data/netly.db

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Create the data directory (fallback if no volume is mounted)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# ── Copy standalone Next.js server ──
COPY --from=builder /app/.next/standalone ./

# ── Copy static assets (served by the standalone server) ──
COPY --from=builder /app/.next/static ./.next/static

# ── Copy public assets ──
COPY --from=builder /app/public ./public

# ── Copy Prisma schema + migrations for runtime (prisma migrate deploy) ──
COPY --from=builder /app/prisma ./prisma

# ── Copy Prisma CLI + engines from builder ──
# Avoids a full `npm install -g prisma` (~100MB). The standalone output
# already includes @prisma/client (production dep). We only need the extra
# prisma CLI packages (dev deps) for `prisma migrate deploy` at runtime.
# prisma generate runs again in the entrypoint as a safety net.
# WHY: node_modules/.bin includes the prisma CLI binary needed by npx.
# Without it, the entrypoint logs "prisma: not found" and the health check
# fails because migrations never run.
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ── Copy VERSION and user docs (not traced by Next.js standalone) ──
COPY --from=builder /app/VERSION ./VERSION
COPY --from=builder /app/docs ./docs

# ── Make Prisma generated client writable by the non-root user ──
# WHY: The entrypoint runs `prisma generate` as a safety net (see entrypoint.sh).
# If the generated client files (from the builder stage) are owned by root,
# the nextjs user cannot overwrite them and gets EACCES. The chown is recursive
# to cover /app/node_modules/.prisma/client/ and any other prisma artifacts.
RUN chown -R nextjs:nodejs /app/node_modules/.prisma /app/node_modules/.bin /app/node_modules/@prisma /app/node_modules/prisma

# ── Copy entrypoint ──
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

USER nextjs

ENTRYPOINT ["/app/entrypoint.sh"]
