# Netly Ledger — Frontend

**Last Updated:** 2026-06-22
**UI Library:** Tailwind CSS v4 + DaisyUI v5 + lucide-react icons
**Charts:** recharts (LineChart, BarChart)
**Frameworks:** next-intl i18n (en / zh / zh-TW / ja / ko), WebAuthn via @simplewebauthn/browser

## Page Tree

```
/ (Dashboard)        — page.tsx (RSC) → DashboardClient (client)
/accounts            — page.tsx (RSC) → AccountsClient
/categories          — page.tsx (RSC) → CategoriesClient
/transactions        — page.tsx (RSC) → TransactionsClient
  ├── FilterBar
  ├── TransactionTable
  ├── TransactionDetailDrawer
  ├── BulkActionPanel
  └── RulePromptModal
/import              — page.tsx (RSC) → ImportClient
/reports             — page.tsx (RSC, Suspense) → ReportsClient
  ├── DateRangePresets
  ├── BalanceSheetPanel
  ├── IncomeStatementPanel
  ├── CashFlowPanel
  └── TransactionDrillDownModal
/settings            — page.tsx (RSC) → SettingsClient
  ├── DatabaseInfoCard
  ├── DatabaseMetricsCard
  ├── ExportCard
  ├── PreferencesCard
  ├── PassKeySection
  ├── McpSection
  └── DangerZoneCard
/docs                — page.tsx (RSC) → DocsClient (markdown renderer)
/login               — Client page (PassKey auth)
/setup               — Client page (PassKey registration)
```

## Component Hierarchy

### Layout
```
layout.tsx (RSC)
  └── LayoutClient (client)
        ├── LocaleProvider (Context: locale, setLocale)
        │     └── NextIntlClientProvider (en.json / zh.json)
        ├── Sidebar (nav: 8 routes + branding)
        │     └── navItems: dashboard, accounts, categories,
        │                  transactions, import, reports, settings, docs
        └── <main> {children}</main>
```

### Dashboard Components (`dashboard-components/`)
```
DashboardClient
  ├── StatCard()           — Metric card with trend deltas/progress
  ├── NetWorthTrendChart   — LineChart (recharts), multi-currency
  ├── IncomeVsExpensesChart— BarChart (recharts) income vs expense
  ├── CashFlowMetrics      — OCF, FCF, Investing, Financing net
  ├── BreakdownList        — Category breakdown with progress bars
  └── AccountBalancesTable — Account list with calculated balances
```

## State Management

- **Server Components (RSC)**: All data fetching, report generation
- **Props → Client**: Serializable JSON props passed to `'use client'` components
- **URL State**: `period`, `filter`, `category` via searchParams
- **Local State**: Currency selector, period selector, form inputs
- **No global state**: No Redux/Zustand — server is source of truth

## Navigation Conventions

All internal links that require query parameters (period, account filter, category filter) **must** use the helper functions in `src/lib/links.ts` rather than hardcoding paths:

| Helper | Produces | Used For |
|--------|----------|----------|
| `buildDashboardUrl(params?)` | `/` or `/?period=...` | Home/dashboard link |
| `buildReportsUrl(period, now, currency?)` | `/reports?start=...&end=...&cur=...` | Stat cards, "Detailed Statements" links |
| `buildAccountTransactionsUrl(accountId)` | `/transactions?accountId=...` | Account table rows |
| `buildCategoryTransactionsUrl(categoryId)` | `/transactions?categoryId=...` | Income/expense breakdown lists |
| `buildDocsUrl()` | `/docs` | In-app user manual link |
| `buildAccountsUrl()` | `/accounts` | Account management |
| `buildCategoriesUrl()` | `/categories` | Category management |
| `buildImportUrl()` | `/import` | CSV import |
| `buildSettingsUrl()` | `/settings` | System settings |
| `buildLoginUrl()` | `/login` | Login page |
| `buildSetupUrl()` | `/setup` | PassKey registration |

This ensures every link carries the correct query params and they stay consistent if param names change.

## i18n

- **Library**: next-intl with `NextIntlClientProvider`
- **Messages**: `messages/en.json`, `messages/zh.json`, `messages/zh-TW.json`, `messages/ja.json`, `messages/ko.json`
- **Locale detection**: `netly_locale` cookie (set client-side in providers.tsx) with `Accept-Language` header fallback on first visit (in `layout.tsx` — `parseAcceptLanguage()`)
- **Context**: `LocaleContext` provides `locale` + `setLocale` to all pages
- **providers.tsx**: Imports all 5 locale message files (`en`, `zh`, `zh-TW`, `ja`, `ko`) and sets `document.title` per locale
