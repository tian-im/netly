# Netly Ledger

Local Bank CSV Statement Analyzer & Personal Ledger.

## Quick Start (Production)

### One-line Docker run

```bash
docker run -d \
  -p 3000:3000 \
  -v ./netly-data:/app/data \
  ghcr.io/yourusername/netly-ledger:latest
```

Then open **http://localhost:3000** in your browser.

### Docker Compose

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## What Gets Stored Where

| Data                | Location                         | Persists?            |
| ------------------- | -------------------------------- | -------------------- |
| SQLite database     | `./netly-data/netly.db`          | ✅ survives restarts |
| Session secret      | `./netly-data/.session-secret`   | ✅ survives restarts |
| CSV statements      | Imported into database           | ✅ stored in DB      |

Everything lives under a single mounted volume (`./netly-data`). No environment variables are required — the session secret is auto-generated on first run and the database is created automatically.

### Linux Permission Note

The container runs as a non-root user (UID 1001, `nextjs`). On **Linux hosts**, the bind-mounted directory must be writable by that user:

```bash
# One-time setup before first run (Linux only)
mkdir -p ./netly-data && chown 1001:1001 ./netly-data
```

On macOS and Docker Desktop, this is handled automatically by the OS permission layer and is not needed.

## Development

```bash
docker compose up -d
npm run dev        # or: docker compose exec web npm run dev
```

## Security Considerations

### Session Revocation in Middleware

The middleware (Edge Runtime) only validates cookie signatures via HMAC — it does **not** check the database for session revocation. This is an intentional tradeoff: the middleware runs in Edge Runtime where PrismaClient is unavailable.

- **Logged-out cookies** remain cryptographically valid for their 7-day TTL
- **Middleware** will allow access to page routes with a recently-logged-out cookie
- **API routes** and server actions still perform a full DB revocation check via `verifySessionWithDb()`

For a local personal finance app, this is acceptable. The most sensitive operations (data reads/writes) are protected by API-level DB checks.

## Environment Variables (Optional)

| Variable                | Default                        | Description                            |
| ----------------------- | ------------------------------ | -------------------------------------- |
| `DATABASE_URL`          | `file:/app/data/netly.db`      | SQLite database path                   |
| `SESSION_SECRET`        | auto-generated (file)          | Override session secret                |
| `SESSION_SECRET_FILE`   | `/app/data/.session-secret`    | Custom path for session secret file (entrypoint and Node.js both respect this) |
| `NODE_ENV`              | `production` (Docker default)  | Environment mode                       |
| `SKIP_MIGRATIONS`       | (unset)                        | Set to `1` to skip `prisma migrate deploy` on startup |
| `SKIP_PRISMA_GENERATE`  | (unset)                        | Set to `1` to skip `prisma generate` on startup |

## Commands

```bash
# Tests
npm test                  # unit tests
npm run test:coverage     # unit tests with coverage
npm run test:all          # unit + integration tests

# Database
npx prisma migrate dev    # create/apply migrations
npx prisma studio         # browse database
```
