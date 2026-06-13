# Netly Ledger — Module Map

**Last Updated:** 2026-06-13

## Directory Layout

```
netly/
├── prisma/
│   ├── schema.prisma        — 9 models (Account, Transaction, Category, Rule, PassKey, Session, Challenge, SetupToken, AuditLog, McpToken)
│   ├── migrations/
│   ├── dev.db               — SQLite (local)
│   └── seed-csv.ts
│
├── messages/
│   ├── en.json              — English i18n
│   └── zh.json              — Chinese i18n
│
├── src/
│   ├── app/                 — Next.js App Router
│   │   ├── page.tsx         — Dashboard (/)
│   │   ├── dashboard-client.tsx
│   │   ├── layout.tsx + layout-client.tsx
│   │   ├── providers.tsx    — LocaleContext
│   │   ├── sidebar.tsx      — 7-route nav
│   │   ├── actions.ts       — All server actions (CRUD, reports, export)
│   │   ├── dashboard-components/ (6 components)
│   │   ├── accounts/  categories/  transactions/
│   │   ├── import/    reports/     settings/
│   │   ├── login/     setup/
│   │   ├── api/import/route.ts
│   │   └── globals.css  loading.tsx  error.tsx  not-found.tsx
│   │
│   ├── lib/               — Core logic
│   │   ├── db.ts          — PrismaClient singleton (WAL mode + busy timeout)
│   │   ├── csv.ts         — Parser (papaparse)
│   │   ├── csv-export.ts  — Export + download
│   │   ├── reports.ts     — BS/IS/CFS generators
│   │   ├── rules.ts       — Auto-categorization pattern matcher
│   │   ├── currencies.ts  — Symbols + compact format
│   │   ├── links.ts       — URL builders for reports/transactions pages
│   │   ├── auth-session.ts— HMAC session cookies
│   │   ├── session-secret.ts — Auto-generate + persist session secret to file
│   │   ├── challenge-store.ts / webauthn.ts — PassKey auth
│   │   ├── rate-limiter.ts — In-memory sliding-window rate limiter
│   │   └── translateError.ts
│   │
│   └── mcp-server/        — AI/LLM tool interface (MCP SDK)
│       ├── data.ts        — fetchAndMapData() shared helper
│       └── tools/
│           ├── accounts.ts    (2 tools)
│           ├── transactions.ts(4 tools)
│           ├── categories.ts  (3 tools)
│           ├── reports.ts     (4 tools)
│           └── analysis.ts    (2 tools)
│
├── docker-compose.yml  Dockerfile.dev  .dockerignore  .env.example
├── next.config.js  tsconfig.json  postcss.config.js
├── vitest.config.ts  vitest.integration.config.ts
└── package.json
```

## Module Dependency Graph

```
lib/db.ts (Prisma singleton) ← used by:
    ├── app/actions.ts         — Server action mutations
    ├── app/page.tsx           — Dashboard (RSC)
    ├── app/*/page.tsx         — All pages
    ├── mcp-server/tools/      — All MCP tools
    └── app/api/               — API routes

lib/reports.ts (BS/IS/CFS) ← used by:
    ├── app/page.tsx           — Dashboard period calculations
    └── mcp-server/tools/reports.ts

lib/csv.ts + lib/rules.ts ← used by:
    ├── app/api/import/route.ts
    └── mcp-server/tools/transactions.ts

lib/links.ts (URL builders) ← used by:
    ├── app/dashboard-client.tsx
    ├── app/dashboard-components/CashFlowMetrics.tsx
    └── app/dashboard-components/AccountBalancesTable.tsx
```

## Key Module Responsibilities

| Module | Exports | Consumed By |
|--------|---------|-------------|
| `lib/csv.ts` | `parseCSV()`, `cleanAmount()`, `parseBankDate()` | API route, MCP tools |
| `lib/reports.ts` | `generateBalanceSheet`, `IncomeStatement`, `CashFlowStatement` | Dashboard, MCP |
| `lib/links.ts` | `buildReportsUrl()`, `buildAccountTransactionsUrl()`, `buildCategoryTransactionsUrl()` | Navigation across all pages — **always use instead of hardcoding paths with query params** |
| `lib/rules.ts` | `matchRule()` | CSV import, MCP tools |
| `lib/auth-session.ts` | `createSessionCookie()`, `verifySessionCookie()`, `verifySessionWithDb()` | Login/setup pages |
| `lib/session-secret.ts` | `getSessionSecret()` | `auth-session.ts` (auto-generate + file persist) |
| `lib/rate-limiter.ts` | `checkRateLimit()`, `resetRateLimiter()` | Auth API routes (login, register, setup-token) |
| `mcp-server/tools/transactions.ts` | `import_csv`, `list_transactions`, `categorize_uncategorized` | AI agents |
| `mcp-server/tools/reports.ts` | `get_dashboard_summary`, `get_financial_reports`, `get_net_worth_trend` | AI agents |
