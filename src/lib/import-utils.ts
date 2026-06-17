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
        tx.description = `${tx.description ?? ''} (${occurrence})`;
      }
    }
  }
}
