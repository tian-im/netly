# Ledger Builder Agent Instructions

You are a specialized senior software engineer agent tasked with implementing the Local Bank CSV Statement Analyzer & Personal Ledger application.

## Core Directives

1. **Strict Test-Driven Development (TDD)**:
   - For all logic files in `/src/lib/`, you MUST write failing unit/integration tests first.
   - Run tests, ensure they are red (fail), implement the logic to make them green (pass), and refactor.
2. **100% Code Coverage Target**:
   - You MUST ensure 100% statement, branch, function, and line coverage for all files in `/src/lib/`.
   - Run coverage analysis via Vitest inside the container (`docker compose exec web npm run test:coverage`) after implementing each component.
3. **Relational SQLite Design**:
   - Maintain data locally on SQLite using Prisma. No blockchain or remote network tunneling architectures.
   - Database schema and calculations must follow the specifications in the architectural review.
4. **Execution via Docker Compose**:
   - All runtime, check, db, and test commands (e.g., `npm`, `npx`, `prisma`, `vitest`, `tsc`, `sqlite3`) MUST be executed inside the running container using `docker compose exec web <command>` (or `docker compose exec -T web <command>`). Do not run them directly on the host machine.
5. **Web & UI Verification**:
   - Run `docker compose exec -T web npm run test:coverage` as the **default** verification method after every change.
   - Use **chrome-devtools** (via MCP) for web/UI verification **only when the user explicitly requests it**. Do NOT use browser_subagent or curl for visual UI checks.
6. **Git Commits on User Request Only**:
   - NEVER run `git commit` or `git push` autonomously. Only commit when the user explicitly asks for it.

## References

Always ground your decisions and implementation steps in the following project documents:
- **Implementation Plan**: [implementation_plan.md](file:///Users/tian/.gemini/antigravity-ide/brain/ef9502a0-cdf2-4bca-a72b-85f9a2a95f01/implementation_plan.md)
- **System Architecture Review**: [architect_review.md](file:///Users/tian/.gemini/antigravity-ide/brain/ef9502a0-cdf2-4bca-a72b-85f9a2a95f01/architect_review.md)
- **Task Checklist**: [task.md](file:///Users/tian/.gemini/antigravity-ide/brain/ef9502a0-cdf2-4bca-a72b-85f9a2a95f01/task.md)

---

## Architectural Rules

### 1. Data Schema (Prisma)
Follow the database model defined in [architect_review.md Section 3](file:///Users/tian/.gemini/antigravity-ide/brain/ef9502a0-cdf2-4bca-a72b-85f9a2a95f01/architect_review.md#L84-L142):
- **Account**: Tracks Assets & Liabilities with standard `startingBalance` and native `currency` settings.
- **Transaction**: Stores dates, amounts, payees, and relations to Accounts and Categories.
- **Category**: Tracks category types (`INCOME`, `EXPENSE`, `TRANSFER`) and cash flow statements grouping (`OPERATING`, `INVESTING`, `FINANCING`).
- **CategoryRule**: Custom regex/keyword match patterns for merchant auto-categorization.

### 2. Core CSV Import Logic (`src/lib/csv.ts`)
- Use `PapaParse` to parse CSV string streams.
- Map variable bank columns dynamically using a saved header map schema.
- Prevent duplicate transactions by checking composite uniqueness key: `(date, payee, amount, accountId)`. Skip existing matches during database inserts.

### 3. Auto-Categorization Engine (`src/lib/rules.ts`)
- Apply keyword rules against incoming transaction `payee` or `description` names.
- Auto-assign matches to the matching Category. Mark unresolved items as `isReviewed = false` for manual UI categorizations.

### 4. Financial Calculations Ledger Engine (`src/lib/reports.ts`)
Implement the formulas defined in [architect_review.md Section 4](file:///Users/tian/.gemini/antigravity-ide/brain/ef9502a0-cdf2-4bca-a72b-85f9a2a95f01/architect_review.md#L146-L175):
- **Independent Currency Ledgers**: Calculate totals and groups strictly partitioned by account currency code, preventing incorrect mathematical additions between different currencies.
- **Income Statement**: Grouped category sums of income and expense within date range, split by currency.
- **Balance Sheet**: Cumulative sum of transaction values up to `endDate` added to accounts `startingBalance`. Group by Asset/Liability and report Net Worth, split by currency.
- **Cash Flow Statement**: Filter out `TRANSFER` transactions. Sum direct transaction values grouped by categories `cashFlowType` (Operating, Investing, Financing), split by currency.

### 5. Frontend & UI System
- Render client using Tailwind CSS v4 and DaisyUI v5 (beta).
- Establish a consistent layout for both desktop dashboard and mobile network screen sizes (PWA configuration).
- Use local server host network binding (`0.0.0.0:3000`) for mobile testing.
