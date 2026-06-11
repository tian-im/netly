# Netly Ledger — Architecture

**Last Updated:** 2026-06-11
**Stack:** Next.js 14 (App Router) + SQLite (Prisma) + Tailwind CSS v4 + DaisyUI v5
**Auth:** WebAuthn (PassKeys) + Session cookies
**i18n:** next-intl (en/zh)

## System Overview

```
User Browser
    │
    ├── Next.js Server (RSC) ──── Prisma ──── SQLite (dev.db)
    │       │
    │       ├── Server Actions (src/app/actions.ts)
    │       └── API Routes (src/app/api/)
    │
    ├── Client Components (useState, transitions)
    │       │
    │       └── MCP Server (src/mcp-server/) — AI/LLM tool interface
    │
    └── Docker (docker compose) for dev isolation
```

## Data Flow

### Dashboard (Home `/`)
```
page.tsx (RSC)
  ├── getAccounts() — server action
  ├── db.transaction.findMany() — raw Prisma
  ├── generateBalanceSheet/IncomeStatement/CashFlowStatement
  └── <DashboardClient> (props: serialized statements + trends)
        ├── StatCard × 4 (NetWorth, NetIncome, SavingsRate, Runway)
        ├── NetWorthTrendChart (recharts LineChart)
        ├── IncomeVsExpensesChart (recharts BarChart)
        ├── CashFlowMetrics (OCF/FCF details)
        ├── BreakdownList × 2 (income sources, expense categories)
        └── AccountBalancesTable
```

### CSV Import Flow
```
File Upload → Auto-detect headers → Column mapping UI
    → POST /api/import → parseCSV() (papaparse)
    → Duplicate filter (date+payee+amount hash)
    → matchRule() auto-categorization
    → db.transaction.createMany()
    → Revalidate all pages
```

### MCP Tool Flow
```
AI/LLM → MCP SDK Server → Tools:
  - accounts: list_accounts, create_account
  - transactions: import_csv, list_transactions, update_transaction_category, categorize_uncategorized
  - categories: list_categories, create_category, create_category_rule
  - reports: get_dashboard_summary, get_financial_reports, get_net_worth_trend, get_income_expense_breakdown
  - analysis: detect_duplicates, identify_recurring_transactions
```

## Key Design Decisions

- **RSC-first**: Pages fetch data on server, pass serializable props to client components
- **SQLite**: Single-file DB (`prisma/dev.db`), no external DB server needed
- **Server Actions** for mutations instead of REST endpoints (except CSV import via `/api/import`)
- **MCP SDK** enables AI agents to interact with the ledger programmatically
- **PassKey auth**: WebAuthn-based passwordless auth, no email/password storage

## Related Codemaps

- [FRONTEND.md](./FRONTEND.md) — Component hierarchy
- [DATA.md](./DATA.md) — Prisma schema
- [MODULES.md](./MODULES.md) — Source structure
