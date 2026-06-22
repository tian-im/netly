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
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ── Copy VERSION and user docs (not traced by Next.js standalone) ──
COPY --from=builder /app/VERSION ./VERSION
COPY --from=builder /app/docs ./docs

# ── Copy entrypoint ──
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

USER nextjs

ENTRYPOINT ["/app/entrypoint.sh"]
