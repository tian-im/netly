# Netly Ledger — Data Layer

**Last Updated:** 2026-06-22
**Database:** SQLite via Prisma ORM
**Location:** `prisma/schema.prisma`

## Entity-Relationship

```
Account ──1:N──▶ Transaction ──N:1──▶ Category
                    │                      │
                    │                  CategoryRule ──N:1──▶ Category
                    │
                    │ (optional category FK)

PassKeyCredential  (WebAuthn credentials, single user)
Session            (auth sessions)
McpToken           (MCP API tokens)
```

## Schema

### Account
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | @id @default(uuid()) |
| name | String | — |
| type | String | "ASSET" or "LIABILITY" |
| startingBalance | Float | Opening balance |
| currency | String | ISO 4217 (default "AUD") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

### Category
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | @id @default(uuid()) |
| name | String | @unique |
| type | String | "INCOME", "EXPENSE", "TRANSFER" |
| cashFlowType | String | "OPERATING", "INVESTING", "FINANCING" |

### Transaction
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | @id @default(uuid()) |
| date | DateTime | Transaction date |
| payee | String | Merchant/entity name |
| description | String? | Optional details |
| amount | Float | Positive=inflow, Negative=outflow |
| accountId | String | FK → Account (Cascade delete) |
| categoryId | String? | FK → Category (SetNull on delete) |
| isReviewed | Boolean | @default(false) |

**Dedup key**: `@@unique([date, payee, amount, description, accountId])` — enforced at both
application level (skip during import) and database level (unique index prevents
insertion even in race conditions or direct DB writes). The `description` field is
included in the constraint because credit card CSVs often produce multiple same-day
transactions with the same payee and amount that differ only by reference/description.

### CategoryRule
| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | @id @default(uuid()) |
| pattern | String | Substring or regex for payee matching |
| categoryId | String | FK → Category (Cascade delete) |

### PassKeyCredential
| Field | Type | Notes |
|-------|------|-------|
| id | String | WebAuthn credential ID |
| userId | String | @default("default") (single-user) |
| publicKey | Bytes | Stored public key |
| counter | BigInt | Auth counter |
| transports | String | JSON array |
| deviceName | String? | User-friendly name |

## Key Queries

- **Balance Sheet**: Aggregate transactions by account up to date, compute net change from startingBalance
- **Income Statement**: Filter transactions by date range + category type (INCOME/EXPENSE), group by category name
- **Cash Flow Statement**: Filter by date range, group by category.cashFlowType (OPERATING/INVESTING/FINANCING)
- **Duplicate detection**: (date, payee, amount) hash pre-computed during CSV import
- **Auto-categorization**: matchRule() loops over CategoryRule patterns against payee/description
