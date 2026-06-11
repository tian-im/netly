# Netly Ledger — Frontend

**Last Updated:** 2026-06-11
**UI Library:** Tailwind CSS v4 + DaisyUI v5 + lucide-react icons
**Charts:** recharts (LineChart, BarChart)
**Frameworks:** next-intl i18n, WebAuthn via @simplewebauthn/browser

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
        ├── Sidebar (nav: 7 routes + branding)
        │     └── navItems: dashboard, accounts, categories,
        │                  transactions, import, reports, settings
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

## i18n

- **Library**: next-intl with `NextIntlClientProvider`
- **Messages**: `messages/en.json`, `messages/zh.json`
- **Locale detection**: `netly_locale` cookie (set in providers.tsx)
- **Context**: `LocaleContext` provides `locale` + `setLocale` to all pages
