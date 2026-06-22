# Ledger Builder Agent Instructions

You are a specialized senior software engineer agent tasked with implementing the Local Bank CSV Statement Analyzer & Personal Ledger application.

## Core Directives

1. **Strict Test-Driven Development (TDD)**:
   - For all logic files in `/src/lib/`, you MUST write failing unit/integration tests first.
   - Run tests, ensure they are red (fail), implement the logic to make them green (pass), and refactor.
2. **100% Code Coverage Target**:
   - You MUST ensure 100% statement, branch, function, and line coverage for all files in `/src/lib/`.
   - Run coverage analysis via Vitest inside the container (`docker compose exec web yarn test:coverage`) after implementing each component.
3. **Relational SQLite Design**:
   - Maintain data locally on SQLite using Prisma. No blockchain or remote network tunneling architectures.
   - Database schema and calculations must follow the specifications in the architectural review.
4. **Package Manager Locked to Yarn**:
   - This project uses **Yarn** as its package manager. The lockfile is `yarn.lock`.
   - ALL commands in documentation, scripts, and agent instructions MUST use `yarn` (not `npm`, not `npx`).
   - NEVER change `yarn` to `npm` or `npx` in any project file. This includes `package.json` scripts, documentation, command templates, and agent instructions.
   - If you see `npm` or `npx` used in a project context, it is a bug — fix it by converting to `yarn`.
   - Examples of correct usage: `yarn install`, `yarn dev`, `yarn test:coverage`, `yarn tsc --noEmit`, `yarn prisma generate`.
5. **Execution via Docker Compose**:
   - All runtime, check, db, and test commands (e.g., `yarn`, `prisma`, `vitest`, `tsc`, `sqlite3`) MUST be executed inside the running container using `docker compose exec web <command>` (or `docker compose exec -T web <command>`). Do not run them directly on the host machine.
6. **Web & UI Verification**:
   - Run `docker compose exec -T web yarn test:coverage` as the **default** verification method after every change.
   - Use **chrome-devtools** (via MCP) for web/UI verification **only when the user explicitly requests it**. Do NOT use browser_subagent or curl for visual UI checks.
7. **Git Commits on User Request Only**:
   - NEVER run `git commit` or `git push` autonomously. Only commit when the user explicitly asks for it.
8. **URL Helper for All Routes**:
   - NEVER hardcode route paths (e.g. `href="/"`, `router.push('/accounts')`) anywhere in the app.
   - Always import and use the URL builder functions from `@/lib/links` (e.g. `buildDashboardUrl()`, `buildAccountsUrl()`, `buildCategoriesUrl()`, `buildImportUrl()`, `buildTransactionsUrl()`, `buildReportsUrl()`, `buildSettingsUrl()`, `buildLoginUrl()`, `buildSetupUrl()`, `buildAccountTransactionsUrl()`, `buildCategoryTransactionsUrl()`).
   - If a new route is added, first add a builder function in `@/lib/links.ts`, then use it everywhere. This centralises path logic so future route changes require only a single edit.
9. **Decision Rationale in Comments ("Why" Comments)**:
   - When you choose one implementation approach among multiple viable options, write a comment explaining **why** that specific choice was made.
   - Format: `// WHY: <rationale>` — e.g., `// WHY: We use client-side case-insensitive comparison instead of a DB UNIQUE constraint because SQLite with Prisma doesn't support case-insensitive unique indexes, and the account count (<100) makes this safe.`
   - If you later read such a `// WHY:` comment and consider changing the code, **confirm with the user before making any changes** to ensure the original trade-off is still understood.

10. **Documentation Maintenance**:
    - After ANY code change, update the corresponding documentation files. Follow this matrix:

    | When you change... | Update these docs |
    |---|---|
    | **Prisma schema** | `architect_review.md` §3, `CODEMAPS/DATA.md`, `CODEMAPS/MODULES.md` |
    | **Server actions** (`actions.ts`) | `CODEMAPS/MODULES.md`, `CODEMAPS/ARCHITECTURE.md` |
    | **`src/lib/` files** (new/deleted/changed) | `CODEMAPS/MODULES.md` (layout + module table + deps) |
    | **MCP tools** (`src/mcp-server/tools/`) | `CODEMAPS/ARCHITECTURE.md`, `CODEMAPS/MODULES.md`, user manuals §9 |
    | **App routes/pages** (`src/app/`) | `CODEMAPS/FRONTEND.md`, `CODEMAPS/MODULES.md`, user manuals |
    | **Sidebar/navigation** | `CODEMAPS/FRONTEND.md`, `CODEMAPS/MODULES.md` |
    | **i18n/locales** (add/remove locale) | `CODEMAPS/ARCHITECTURE.md`, `CODEMAPS/FRONTEND.md`, `CODEMAPS/MODULES.md`, user manuals §9 |
    | **URL helpers** (`src/lib/links.ts`) | `CODEMAPS/MODULES.md`, `CODEMAPS/FRONTEND.md` |
    | **Auth/security** | `CODEMAPS/ARCHITECTURE.md`, user manuals §1 |
    | **Financial reports** (`src/lib/reports.ts`) | `architect_review.md` §4, user manuals §8 |
    | **CSV import** (`src/lib/csv.ts`) | `architect_review.md`, `CODEMAPS/ARCHITECTURE.md`, user manuals §4 |
    | **Implementation plan completed** | Mark as `✅ COMPLETED` with date |
    | **Any user-visible feature change** | `CHANGELOG.md` — add bullet under `## Unreleased` |

    - **Codemaps** (`docs/CODEMAPS/*.md`): Must reflect the **current** codebase. Update file counts, tool counts, route counts, dependency graphs, and component lists whenever code changes.
    - **Architect review** (`docs/architect_review.md`): Update when schema, calculation logic, or architectural decisions change.
    - **User manuals** (`docs/user_manual.en.md`, `docs/user_manual.zh.md`): English is primary. When it changes, add `<!-- TODO: translate from en/user_manual.en.md -->` at the top of the Chinese version if it falls behind.
    - **Changelog** (`docs/CHANGELOG.md`): Add a bullet for every completed feature, bug fix, or notable change. Format: `- Added / Changed / Fixed / Removed: <description>`.
    - **Implementation plans** (`docs/implementation_plan*.md`): Never delete completed plans — mark them as `✅ COMPLETED` and keep for historical reference.

## References

Always ground your decisions and implementation steps in the following project documents:
- **Implementation Plan**: [docs/implementation_plan.md](./docs/implementation_plan.md)
- **System Architecture Review**: [docs/architect_review.md](./docs/architect_review.md)
- **User Manual (English)**: [docs/user_manual.en.md](./docs/user_manual.en.md)
- **User Manual (Chinese)**: [docs/user_manual.zh.md](./docs/user_manual.zh.md)
- **Codebase Maps**: [docs/CODEMAPS/](./docs/CODEMAPS/)
  - [ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md) — High-level system overview
  - [MODULES.md](./docs/CODEMAPS/MODULES.md) — Source directory layout & dependencies
  - [DATA.md](./docs/CODEMAPS/DATA.md) — Database schema & queries
  - [FRONTEND.md](./docs/CODEMAPS/FRONTEND.md) — Page tree & component hierarchy

---

## Architectural Rules

### 1. Data Schema (Prisma)
Follow the database model defined in [architect_review.md Section 3](./docs/architect_review.md#L87-L145):
- **Account**: Tracks Assets & Liabilities with standard `startingBalance` and native `currency` settings.
- **Transaction**: Stores dates, amounts, payees, and relations to Accounts and Categories.
- **Category**: Tracks category types (`INCOME`, `EXPENSE`, `TRANSFER`) and cash flow statements grouping (`OPERATING`, `INVESTING`, `FINANCING`).
- **CategoryRule**: Custom regex/keyword match patterns for merchant auto-categorization.

### 2. Core CSV Import Logic (`src/lib/csv.ts`)
- Use `PapaParse` to parse CSV string streams.
- Map variable bank columns dynamically using a saved header map schema.
- Prevent duplicate transactions by checking composite uniqueness key: `(date, payee, amount, description, accountId)`. Skip existing matches during database inserts.

### 3. Auto-Categorization Engine (`src/lib/rules.ts`)
- Apply keyword rules against incoming transaction `payee` or `description` names.
- Auto-assign matches to the matching Category. Mark unresolved items as `isReviewed = false` for manual UI categorizations.

### 4. Financial Calculations Ledger Engine (`src/lib/reports.ts`)
Implement the formulas defined in [architect_review.md Section 4](./docs/architect_review.md#L149-L177):
- **Independent Currency Ledgers**: Calculate totals and groups strictly partitioned by account currency code, preventing incorrect mathematical additions between different currencies.
- **Income Statement**: Grouped category sums of income and expense within date range, split by currency.
- **Balance Sheet**: Cumulative sum of transaction values up to `endDate` added to accounts `startingBalance`. Group by Asset/Liability and report Net Worth, split by currency.
- **Cash Flow Statement**: Filter out `TRANSFER` transactions. Sum direct transaction values grouped by categories `cashFlowType` (Operating, Investing, Financing), split by currency.

### 5. Frontend & UI System
- Render client using Tailwind CSS v4 and DaisyUI v5 (beta).
- Establish a consistent layout for both desktop dashboard and mobile network screen sizes (PWA configuration).
- Use local server host network binding (`0.0.0.0:3000`) for mobile testing.

### 6. MCP Server (`src/mcp-server/`)
- The app exposes an MCP (Model Context Protocol) server at `/api/mcp` for AI agent integration.
- Tools are registered in `src/mcp-server/tools/` and organized by domain: `accounts.ts`, `transactions.ts`, `categories.ts`, `reports.ts`, `analysis.ts`.
- The `data.ts` shared utility fetches and maps all accounts, transactions, and categories together.
- All MCP tools implement Zod validation and return structured JSON responses.
- MCP tokens are managed in the `McpToken` table (SHA-256 hashed), with admin setup at `/setup`.

### 7. Authentication (WebAuthn/PassKey)
- The app uses WebAuthn (`@simplewebauthn/server` + `@simplewebauthn/browser`) for passwordless authentication.
- Server-side session auth is in `src/lib/auth-session.ts` with HMAC-signed cookies (`src/lib/session-crypto.ts`).
- Routes are protected by Next.js middleware (`src/middleware.ts`) — public paths: `/login`, `/setup`, API routes.
- WebAuthn credential management and session lifecycle are in `src/app/api/auth/`.
