# Netly Ledger — User Manual & Reference Guide

Welcome to **Netly Ledger**, a local-first, privacy-focused personal financial engine. Netly Ledger runs 100% on your device: all accounts, transactions, and rules are stored in a local SQLite database. There are no cloud servers, no ads, and no telemetry tracking your financial life.

This manual provides an in-depth explanation of every feature, workflow, and setting in Netly Ledger.

---

## Table of Contents
1. [Getting Started & Security](#1-getting-started--security)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Accounts Management](#3-accounts-management)
4. [Bank Statement CSV Import](#4-bank-statement-csv-import)
5. [Transaction Ledger](#5-transaction-ledger)
6. [Auto-Categorization Rules](#6-auto-categorization-rules)
7. [Duplicate Transaction Reconciliation](#7-duplicate-transaction-reconciliation)
8. [Financial Statements & Reports](#8-financial-statements--reports)
9. [System Settings & Utilities](#9-system-settings--utilities)

---

## 1. Getting Started & Security

### Cryptographic Security (PassKeys)
Netly Ledger uses **WebAuthn (PassKeys)** to secure access to your local ledger. PassKeys replace traditional passwords with cryptographically secure credentials tied to your physical device (such as Touch ID, Face ID, or Windows Hello).
- **First-Time Setup**: When you launch the application for the first time, you will be prompted to enter a **Device Name** (e.g., "My MacBook Air") and register your first PassKey.
- **Subsequent Logins**: Simply click "Sign in with PassKey" and authenticate with your device.
- **Multi-Device Sync**: If you want to access the app from another device (e.g., a phone or second computer) that does not share your credential sync network:
  1. On your registered device, go to **Settings** -> **PassKeys**.
  2. Click **Add Device** / **Generate Setup Code**. This creates a single-use setup code that expires in 15 minutes.
  3. On the new device, navigate to the login page, select **Use setup code**, and enter the code to bootstrap your new credential.

### Data Privacy & Storage
All data is saved in a single-file SQLite database located at `prisma/dev.db` in your installation directory. A session signing key is auto-generated on the first run and stored locally in `.session-secret`. Backup and maintenance of this file are entirely under your control.

---

## 2. Dashboard Overview

The **Dashboard** is the financial cockpit of Netly Ledger. It aggregates ledger data across your accounts to provide a real-time summary of your financial health.

### Key Financial Metrics
At the top of the dashboard are four key metrics cards:
1. **Net Worth**: The combined balance of all assets minus all liabilities. It is computed in your selected currency.
2. **Net Income**: Your total revenue minus total expenses for the selected period, with a percentage delta comparing it to the preceding period.
3. **Savings Rate**: The percentage of your income that was saved (Net Income / Total Revenue). A target of **20%+** is recommended.
4. **Cash Runway**: An estimation of how many months your liquid assets can sustain you based on your trailing average monthly spending (burn rate). If your net cash flow is positive, the card displays **Cash Flow Positive**.

### Interactive Charts
- **Net Worth Trend**: A line chart showing your cumulative net worth trend. It features a dedicated range selector (supporting **3M**, **6M**, and **12M** trailing scopes) decoupled from the main dashboard period filter to ensure a meaningful trend trajectory even when analyzing a single month. If you have accounts in multiple currencies, you can filter the chart by currency.
- **Income vs Expenses**: A comparison bar chart showing total revenue vs. total spending.
- **Cash Flow Metrics**: Provides a breakdown of your cash inflows and outflows categorized by **Operating Cash Flow (OCF)** (daily living), **Free Cash Flow (FCF)** (liquid surplus), **Investing Cash Flow Net** (buying/selling assets), and **Financing Cash Flow Net** (debt repayments).

### breakdowns & Balances
- **Breakdown Lists**: Shows your top income sources and expense categories sorted by volume, with progress bars indicating their percentage of the total.
- **Account Balances**: A table listing all your assets and liabilities with their current balances. Clicking on any account row takes you to its transaction ledger.

---

## 3. Accounts Management

The **Accounts Manager** (`/accounts`) lets you configure your financial ledger layout. Netly Ledger supports two main categories of accounts:

### Account Types
1. **Assets (Cash, Savings, Checking)**: Represents money you own. These accounts carry positive balances.
2. **Liabilities (Credit Cards, Loans, Debt)**: Represents money you owe. Although they are displayed as negative balances in report sheets, they are configured with positive values (e.g., a credit card debt of $1,200 is entered as $1,200, and the ledger handles the negative arithmetic).

### Creating and Editing Accounts
- **Adding an Account**: Enter the Account Name, select its Type, choose the Currency (e.g., AUD, USD, CNY), and specify the Starting Balance.
- **Starting Balance**: This represents the account balance prior to any imported transactions.
- **Editing**: You can modify the account name, starting balance, or currency at any time.
- **Deletion**: Warning — Deleting an account will permanently purge all transactions associated with it from the database.

---

## 4. Bank Statement CSV Import

Netly Ledger does not connect directly to bank APIs, preserving your privacy. Instead, you import bank statement files via the **Bank CSV Import** tool (`/import`).

### Step-by-Step Import Flow
1. **File Upload**: Drag and drop your bank's CSV statement or click to browse.
2. **Configuration**:
   - **Header Row**: Toggle if the CSV contains a header row.
   - **Target Account**: Select which managed account these transactions belong to.
   - **Date Format**: Choose the correct layout format (`DD/MM/YYYY`, `MM/DD/YYYY`, or `YYYY-MM-DD`) matching the statement file.
   - **Amount Mapping Type**:
     - *Single Column*: Choose this if deposits and withdrawals are listed in a single column (deposits are positive, withdrawals are negative).
     - *Split Credit/Debit Columns*: Choose this if your bank lists deposits (Credits) and withdrawals (Debits) in separate columns.
3. **Column Mapping**: Map Netly Ledger's standard fields to the corresponding CSV columns:
   - **Transaction Date** (Required)
   - **Payee / Description** (Required)
   - **Amount** or **Credit/Debit Columns** (Required)
   - **Description Column** (Optional memo or reference)
4. **Data Preview**: A table displays the first three parsed rows of the CSV in real-time, letting you verify that dates, payees, and amounts are parsing correctly before committing the import.
5. **Auto-Categorization**: On import, Netly Ledger automatically runs payee names against your saved **Match Rules** to categorize transaction ledger items.
6. **Duplicate Filter**: The importer automatically screens transactions to skip exact duplicates (where date, payee, amount, and account match exactly).

---

## 5. Transaction Ledger

The **Transaction Ledger** (`/transactions`) serves as your chronological financial log.

### Filters and Searching
The filter bar allows you to quickly isolate specific subsets of transactions:
- **Search Bar**: Query payee names, descriptions, category names, or account names.
- **Account & Category Filter**: Limit results to specific accounts or categories.
- **Uncategorized Only**: Toggle to show only transactions waiting for category assignment.
- **Date Presets**: Limit the view to presets (Current Month, Trailing 3/6/12 Months, Year to Date) or select "All Time".
- **Review Status**: Filter by **Reviewed Only** or **Needs Review Only**.
- **Currency**: Filter transactions by their account currency.

### Detailed Transaction Drawer
Clicking on any transaction opens the **Details Drawer** on the right side:
- **Edit Fields**: Modify the Date, Payee name, Memo description, Account, Category, and Amount.
- **Review Checkbox**: Toggle the "Reviewed" status. Unreviewed items will be flagged in the app as pending review.
- **Keyword Rule Matching**: If the transaction matched a rule, the drawer shows which pattern it matched.
- **Create Rule from Payee**: Easily generate an auto-categorization rule directly from the payee string.

### Bulk Actions
Select multiple transactions using the table checkboxes to apply bulk changes:
- **Bulk Categorization**: Set the category for all selected transactions at once.
- **Bulk Deletion**: Permanently delete all selected entries.
- **Bulk Uncategorization**: Clear the assigned categories.

### Import-Driven Ledger Architecture
To maintain absolute consistency with your real-world bank records and prevent manual entry discrepancy errors, Netly Ledger operates as an import-driven auditing tool. You cannot manually add individual transactions from scratch. Instead, transactions are populated exclusively by uploading bank statement CSV files. Once imported, you can modify their categories, reviewed status, details (such as dates, payee keywords, and amount balances), or delete them.

---

## 6. Auto-Categorization Rules

To minimize manual bookkeeping, Netly Ledger uses keyword-matching rules to categorize incoming bank transactions.

### Creating Match Rules
- **From Category Manager** (`/categories` -> **Match Rules** tab): Enter a **Merchant Keyword** (e.g., "Uber" or "Coles") and search or select the target category using the autocomplete selector.
- **From Transaction Drawer**: Click "Create Rule from Payee". The app will prompt you to save the rule.
- **Regex Support**: Keywords support Regular Expressions. For example, a pattern of `^Netflix.*Subscription$` will match any payee starting with "Netflix" and ending with "Subscription".

### Configuration Preference
In **Settings** -> **App Preferences**, you can configure the **Auto-Categorization Mode**:
- **Ask to create rules**: Prompts you with a dialog modal to save a rule whenever you manually categorize a transaction.
- **Automatically create rules**: Saves a keyword rule immediately upon manual categorization without prompting.
- **Never create rules**: Disables rule-generation prompts during manual entry.

---

## 7. Duplicate Transaction Reconciliation

When bank statements overlap, duplicate transactions can end up in your ledger. Netly Ledger includes a robust reconciliation tool.

### Composite Matching
Duplicates are detected when multiple transactions in the same account share identical values for:
- **Date**
- **Payee**
- **Amount**
- **Description / Memo**

### Reconciliation Workflow
If duplicates are found, a banner will appear at the top of the Transaction Ledger. Clicking **Review Duplicates** opens the Reconciliation interface:
- Duplicate transactions are grouped together.
- **Keep One, Delete Rest**: Retains a single transaction and deletes the duplicates.
- **Not Duplicates**: Dismisses the group if they represent legitimate recurring charges on the same day.

---

## 8. Financial Statements & Reports

The **Financial Statements** page (`/reports`) compiles your ledger records into standard accounting statements.

### Compilation Controls
- **Date Selectors**: Enter a custom Start Date and End Date, or choose a preset period from the dropdown (Last Month, Trailing 3/6/12 Months, YTD, All Time).
- **Compare to Prior Period**: Toggle this option to generate a period-over-period comparison, displaying absolute and percentage differences.
- **View Currency**: Since calculations must be performed in a single currency, select which currency statement to compile.
- **Drill-down Modal**: Clicking on any category row on a statement opens a drill-down modal showing all ledger transactions that make up that total.

### The Three Statements
1. **Balance Sheet**:
   - Lists assets, liabilities, and Net Worth/Equity.
   - Retained Earnings are automatically calculated as total historic revenue minus expenses up to the selected date.
   - Displays your **Debt-to-Asset Ratio** (Total Liabilities / Total Assets).
2. **Income & Expense Statement (損益表)**:
   - Displays Revenue (Inflows), Expenses (Outflows), and Net Income (surplus/deficit).
   - Displays your **Savings Rate** (Net Income / Total Revenue).
3. **Statement of Cash Flows**:
   - Tracks actual cash movement divided into three sections:
     - *Operating Activities*: Day-to-day cash flow (living expenses, salaries).
     - *Investing Activities*: Buying or selling assets (investments, equipment).
     - *Financing Activities*: Borrowing, equity, or debt servicing.
   - Reconciles cash at the beginning of the period to cash at the end of the period.

---

## 9. System Settings & Utilities

The **Settings** page (`/settings`) contains administrative tools for your local ledger.

### App Preferences
Saved to your browser's local storage:
- **Default Currency**: The currency pre-selected for dashboards and statements.
- **Default Date Range**: The default period for the dashboard analysis (e.g. Trailing 3 Months, YTD).
- **Preferred Date Format**: Set your date display format (`DD/MM/YYYY`, `MM/DD/YYYY`, or `YYYY-MM-DD`).
- **Interface Language**: Switch between English and Simplified Chinese (中文 简体).

### Database Info & Maintenance
- **Vacuum & Optimize Database**: Reorganizes the database file on disk, reclaiming unused database space and optimizing index layouts.
- **Database Metrics**: Quick counts of your managed accounts, imported transactions, and matching rules.
- **Danger Zone**: Wipe Database — Clears all data, letting you start fresh. You must type `WIPE` to execute.

### Data Export & Import
- **Export Transactions**: Download a CSV containing all transaction ledger records.
- **Export Accounts**: Download a CSV containing all account structural details.
- **Import Accounts**: Restore or import accounts from a CSV backup file. The tool parses the file and displays an interactive preview modal showing the parsed account names, types, currencies, and starting balances. Accounts that already exist in the database (by name or ID) are flagged and automatically skipped on confirmation.
- **Export Full Ledger**: From the reports page, download a comprehensive CSV pack containing all data.

### Model Context Protocol (MCP) Access
For users who use AI coding assistants or local LLM agents (such as OpenCode Client):
- Netly Ledger runs an SSE MCP server at `/api/mcp`.
- **Generate Token**: Under the MCP settings card, click "Generate Token" and name the token (e.g. "My Agent").
- **Configuration**: Use this token as a Bearer Auth header in your AI tool client configuration. This grants the AI agent secure, programmatic access to query your accounts, transaction ledger, and categories.

  For example, in **Claude Desktop** or **OpenCode Client**'s configuration JSON:
  ```json
  {
    "mcpServers": {
      "netly-ledger": {
        "url": "http://localhost:3000/api/mcp",
        "headers": {
          "Authorization": "Bearer YOUR_MCP_TOKEN"
        }
      }
    }
  }
  ```
- **Revocation**: Revoke any active token instantly to block access.

### Backing Up Your Data
Since Netly Ledger runs 100% on your local machine, your data is completely under your control.
- **Database Location**: Your financial data is stored in a single SQLite database file at `prisma/dev.db` relative to the workspace directory.
- **Session Secrets**: Active sessions and PassKey verification challenges rely on the `.session-secret` file generated in the workspace root.
- **Creating a Backup**: Simply make a copy of the `prisma/dev.db` and `.session-secret` files and store them in a secure secondary location (such as an encrypted drive or private cloud storage). Make sure the server container is stopped or idle before copying to prevent partial writes.
- **Restoring Data**: To restore your data, replace the `prisma/dev.db` and `.session-secret` files in your workspace directory with your backed-up copies.

### Submitting Issues & Feedback
If you encounter any bugs, have feature requests, or want to provide general feedback, please lodge an issue on our GitHub repository:
- **GitHub Issue Tracker**: [Lodge a new issue](https://github.com/tian-im/netly/issues/new)
- You can also access this link directly from the **Support Netly Ledger** card on the **Settings** page.

