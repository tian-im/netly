# Netly Ledger — Module Map

**Last Updated:** 2026-06-22

## Directory Layout

```
netly/
├── prisma/
│   ├── schema.prisma        — 9 models (Account, Category, Transaction, CategoryRule, PassKeyCredential, Session, AuditLog, McpToken, SetupToken)
│   ├── migrations/
│   ├── dev.db               — SQLite (local)
│   └── seed-csv.ts
│
├── messages/
│   ├── en.json              — English i18n
│   ├── zh.json              — Chinese (Simplified) i18n
│   ├── zh-TW.json           — Chinese (Traditional) i18n
│   ├── ja.json              — Japanese i18n
│   └── ko.json              — Korean i18n
│
├── src/
│   ├── app/                 — Next.js App Router
│   │   ├── page.tsx         — Dashboard (/)
│   │   ├── dashboard-client.tsx
│   │   ├── layout.tsx + layout-client.tsx
│   │   ├── providers.tsx    — LocaleContext
│   │   ├── sidebar.tsx      — 8-route nav
│   │   ├── actions.ts       — All server actions (CRUD, reports, export)
│   │   ├── dashboard-components/ (6 components)
│   │   ├── accounts/  categories/  transactions/
│   │   ├── import/    reports/     settings/
│   │   ├── login/     setup/       docs/
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
│   │   ├── iso-4217-data.ts — Currency metadata registry
│   │   ├── links.ts       — URL builders for all routes
│   │   ├── dates.ts       — Date formatting & presets
│   │   ├── locale.ts      — Locale resolution & default categories
│   │   ├── preferences.ts — Client preference persistence
│   │   ├── default-categories.ts — Onboarding category seeding
│   │   ├── duplicates.ts  — Duplicate detection engine
│   │   ├── import-utils.ts— Account import validation
│   │   ├── mappers.ts     — Field mapping utilities
│   │   ├── auth-session.ts— HMAC session cookies
│   │   ├── session-secret.ts — Auto-generate + persist session secret to file
│   │   ├── session-crypto.ts — Edge-compatible session HMAC
│   │   ├── challenge-store.ts / webauthn.ts — PassKey auth
│   │   ├── rate-limiter.ts — In-memory sliding-window rate limiter
│   │   ├── csrf.ts        — CSRF validation helper
│   │   ├── request-utils.ts— Request utilities (getClientIp, checkPayloadSize)
│   │   ├── audit.ts       — Audit logging helper
│   │   ├── constants.ts   — Shared constants
│   │   ├── render-delta.tsx— Delta rendering component
│   │   ├── translate-category.ts — Category name localisation
│   │   ├── test-db.ts     — Test database helper
│   │   └── translateError.ts
│   │
│   └── mcp-server/        — AI/LLM tool interface (MCP SDK)
│       ├── data.ts        — fetchAndMapData() shared helper
│       └── tools/
│           ├── accounts.ts    (2 tools)
│           ├── transactions.ts(5 tools)
│           ├── categories.ts  (6 tools)
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
    ├── app/sidebar.tsx
    ├── app/dashboard-client.tsx
    ├── app/dashboard-components/CashFlowMetrics.tsx
    ├── app/dashboard-components/AccountBalancesTable.tsx
    └── All pages requiring typed navigation links
```

## Key Module Responsibilities

| Module | Exports | Consumed By |
|--------|---------|-------------|
| `lib/csv.ts` | `parseCSV()`, `cleanAmount()`, `parseBankDate()` | API route, MCP tools |
| `lib/reports.ts` | `generateBalanceSheet`, `IncomeStatement`, `CashFlowStatement` | Dashboard, MCP |
| `lib/links.ts` | `buildDashboardUrl()`, `buildReportsUrl()`, `buildAccountTransactionsUrl()`, `buildCategoryTransactionsUrl()`, `buildDocsUrl()`, `buildLoginUrl()`, `buildSetupUrl()`, etc. | Navigation across all pages — **always use instead of hardcoding paths** |
| `lib/rules.ts` | `matchRule()` | CSV import, MCP tools |
| `lib/auth-session.ts` | `createSessionCookie()`, `verifySessionCookie()`, `verifySessionWithDb()` | Login/setup pages |
| `lib/session-secret.ts` | `getSessionSecret()` | `auth-session.ts` (auto-generate + file persist) |
| `lib/rate-limiter.ts` | `checkRateLimit()`, `resetRateLimiter()` | Auth API routes (login, register, setup-token) |
| `lib/csrf.ts` | `verifyCsrf()` | State-changing API routes |
| `lib/request-utils.ts` | `getClientIp()`, `checkPayloadSize()` | API and auth routes |
| `lib/audit.ts` | `auditLog()` | Auth, import, and token routes |
| `lib/locale.ts` | `parseAcceptLanguage()`, `resolveLocale()`, `getDefaultCategories()` | `layout.tsx`, `providers.tsx`, `docs/page.tsx` |
| `lib/preferences.ts` | `PREFERENCES`, `getPreference()`, `setPreference()` | Client components, `providers.tsx` |
| `lib/duplicates.ts` | `detectDuplicateGroups()` | `actions.ts`, MCP analysis tools |
| `lib/import-utils.ts` | `validateAccountImport()`, `isAccountDuplicate()` | `actions.ts` (importAccounts) |
| `lib/default-categories.ts` | Default category seeding based on locale | `actions.ts` (onboarding) |
| `lib/iso-4217-data.ts` | ISO 4217 currency metadata registry | `lib/currencies.ts` |
