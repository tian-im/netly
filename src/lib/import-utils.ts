import type { ParsedTransaction } from './csv';

/**
 * Build a canonical key from (date, payee, amount, description) for duplicate
 * detection and disambiguation. All fields are normalised so that two
 * semantically identical transactions always produce the same key:
 *
 *   - Date → calendar day (ISO date string, no time component)
 *   - Payee → lowercased, trimmed
 *   - Amount → rounded to 2 decimal places, .toFixed(2) for consistent width
 *   - Description → lowercased, trimmed, null/undefined → empty string
 *
 * This is a private helper used by both makeHash and disambiguateDescriptions.
 */
function makeKey(
  date: Date,
  payee: string,
  amount: number,
  description: string | null | undefined
): string {
  const dateStr = date.toISOString().split('T')[0];
  const roundedAmount = Math.round(amount * 100) / 100;
  return `${dateStr}_${payee.toLowerCase().trim()}_${roundedAmount.toFixed(2)}_${(description ?? '').toLowerCase().trim()}`;
}

/**
 * Generate a unique hash for a transaction to detect duplicates.
 * Normalises the date to calendar day, rounds amount to 2 decimal places,
 * and trims/lowercases text fields.
 */
export function makeHash(
  date: Date,
  payee: string,
  amount: number,
  description: string | null | undefined
): string {
  return makeKey(date, payee, amount, description);
}

/**
 * Batch-level disambiguation: within a single CSV import, if two transactions
 * have the exact same (date, payee, amount, description), automatically append
 * " (2)", " (3)", etc. to the description to differentiate them.
 * This handles bank CSVs where same-day same-merchant transactions have
 * identical descriptions.
 *
 * Mutates the transactions array in place.
 */
export function disambiguateDescriptions(txs: ParsedTransaction[]): void {
  if (txs.length === 0) return;

  const keyCounts = new Map<string, number>();
  for (const tx of txs) {
    const key = makeKey(tx.date, tx.payee, tx.amount, tx.description);
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }

  const keyOccurrence = new Map<string, number>();
  for (const tx of txs) {
    const key = makeKey(tx.date, tx.payee, tx.amount, tx.description);
    const count = keyCounts.get(key)!;
    if (count > 1) {
      const occurrence = (keyOccurrence.get(key) || 0) + 1;
      keyOccurrence.set(key, occurrence);
      if (occurrence > 1) {
        const descPrefix = tx.description ? `${tx.description} ` : '';
        tx.description = `${descPrefix}(${occurrence})`;
      }
    }
  }
}

export interface AccountImportItem {
  id?: string;
  name: string;
  type?: string;
  currency?: string;
}

export interface AccountImportInput {
  id?: string;
  name?: string;
  type?: string;
  currency?: string;
}

/**
 * Validates a single account import row.
 * Returns { isValid: boolean, error?: string }.
 */
export function validateAccountImport(
  account: AccountImportInput,
  supportedCurrencies: Set<string>
): { isValid: boolean; error?: string } {
  const name = String(account.name || '').trim();
  if (!name) {
    return { isValid: false, error: 'ERR_ACCOUNT_NAME_REQUIRED' };
  }

  const type = String(account.type || '').trim().toUpperCase();
  if (type !== 'ASSET' && type !== 'LIABILITY') {
    return { isValid: false, error: 'ERR_INVALID_TYPE' };
  }

  const currency = String(account.currency || '').trim().toUpperCase();
  if (currency && !supportedCurrencies.has(currency)) {
    return { isValid: false, error: 'ERR_INVALID_CURRENCY' };
  }

  const id = account.id ? String(account.id).trim() : undefined;
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { isValid: false, error: 'ERR_INVALID_ID' };
  }

  return { isValid: true };
}

/**
 * Checks if an account import row is a duplicate in the database or the current batch.
 */
export function isAccountDuplicate(
  account: AccountImportItem,
  existingIds: Set<string>,
  existingNames: Set<string>,
  batchIds: Set<string>,
  batchNames: Set<string>
): { isDuplicate: boolean; duplicateType?: 'db' | 'batch' } {
  const name = account.name.trim().toLowerCase();
  const id = account.id?.trim().toLowerCase();

  if (existingNames.has(name) || (id && existingIds.has(id))) {
    return { isDuplicate: true, duplicateType: 'db' };
  }

  if (batchNames.has(name) || (id && batchIds.has(id))) {
    return { isDuplicate: true, duplicateType: 'batch' };
  }

  return { isDuplicate: false };
}

