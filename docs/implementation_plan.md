# Implementation Plan - Category Management

This plan details the addition of Category Management features to the Netly Ledger application. We will add capabilities to create and delete financial categories dynamically and view associated metrics.

---

## User Review Required

> [!IMPORTANT]
> - **Category Types**: Categories must have a type (`INCOME`, `EXPENSE`, `TRANSFER`) and a Cash Flow Statement section grouping (`OPERATING`, `INVESTING`, `FINANCING`). We will validate these selections in the creation form.
>   - **Standard Protected Categories**: To prevent breaking core ledger calculations and rules, standard seeded categories (specifically `Transfer`) will be protected from deletion.
>   - **Impact of Deletion**: When a category is deleted, related transactions will automatically have their categories set to `null` (marked as "Uncategorized" in the Ledger view). We will display a confirmation dialog showing how many transactions are currently mapped to the category before executing deletion.

---

## Open Questions

> [!NOTE]
> None. We will keep standard styling (DaisyUI v5 + Tailwind CSS v4) matching the rest of the application.

---

## Proposed Changes

### Database Actions & Backend

#### [MODIFY] [actions.ts](file:///Users/tian/Desktop/workspace/netly/src/app/actions.ts)
- Add Server Action `createCategory(name: string, type: string, cashFlowType: string)`
  - Validate inputs (non-empty, type, cashFlowType values).
  - Verify name is unique.
  - Insert Category into the database.
- Add Server Action `deleteCategory(id: string)`
  - Prevent deleting the protected category named `Transfer`.
  - Delete category from database.

### Navigation Layout

#### [MODIFY] [layout.tsx](file:///Users/tian/Desktop/workspace/netly/src/app/layout.tsx)
- Insert a navigation link for `🏷️ Categories` pointing to `/categories`.

### Categories Management Page

#### [NEW] [page.tsx](file:///Users/tian/Desktop/workspace/netly/src/app/categories/page.tsx)
- Server Component that loads all categories (including transaction counts) and passes them to `CategoriesClient`.

#### [NEW] [categories-client.tsx](file:///Users/tian/Desktop/workspace/netly/src/app/categories/categories-client.tsx)
- Client Component displaying a layout:
  - **Left column (2/3 width)**: Table listing all categories showing:
    - Category Name
    - Type badge (Income, Expense, Transfer)
    - Cash Flow Type badge
    - Total Transaction Count
    - Delete button (disabled for protected categories).
  - **Right column (1/3 width)**: Creation form containing:
    - Name field
    - Category Type selector (INCOME, EXPENSE, TRANSFER)
    - Cash Flow Type selector (OPERATING, INVESTING, FINANCING).

---

## Verification Plan

### Automated Verification
- Run typescript compilation checks: `docker compose exec -T web npx tsc --noEmit`
- Run core tests and verify coverage: `docker compose exec -T web yarn test:coverage`

### Manual Verification
- Deploy changes and verify navigation to `/categories` works.
- Create an income category named "Freelance" and verify it appears in the categories list and transaction select dropdowns.
- Create an expense category named "Dining Out". Assign some transactions to it.
- Delete the "Dining Out" category and verify those transactions return to "Uncategorized" state in the ledger.
- Try to delete the "Transfer" category and verify it is rejected or protected.
