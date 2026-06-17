/**
 * Shared translation helpers for category and account types.
 *
 * These functions are duplicated across multiple transaction page components.
 * Extracted here to ensure a single source of truth — if the business ever adds
 * more types (e.g. EQUITY, REVENUE), only this file needs updating.
 *
 * The `t` parameter type is intentionally a simple string-keyed function rather
 * than next-intl's full Translator type because we only ever call it as
 * `t('some.key')` — the additional methods (rich, markup, raw, has) are unused
 * here and would complicate testing.
 */

type UseTranslateFn = (key: string) => string;

/**
 * Translate a category type (INCOME / EXPENSE / TRANSFER) into the
 * current locale's display name.
 */
export function translateCategoryType(t: UseTranslateFn, type: string): string {
  switch (type) {
    case 'INCOME':
      return t('table.income');
    case 'EXPENSE':
      return t('table.expense');
    case 'TRANSFER':
      return t('table.transfer');
    default:
      return type;
  }
}

/**
 * Translate an account type (ASSET / LIABILITY) into the current locale's
 * display name.
 */
export function translateAccountType(t: UseTranslateFn, type: string): string {
  switch (type) {
    case 'ASSET':
      return t('table.asset');
    case 'LIABILITY':
      return t('table.liability');
    default:
      return type;
  }
}
