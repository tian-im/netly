import { Transaction } from '@/app/transactions/types';

export interface DuplicateGroup {
  id: string; // Unique string key for the duplicate group
  date: Date;
  payee: string;
  amount: number;
  transactions: Transaction[];
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

export function areDescriptionsSimilar(desc1: string | null, desc2: string | null): boolean {
  const d1 = (desc1 || '').toLowerCase().trim();
  const d2 = (desc2 || '').toLowerCase().trim();

  if (d1 === d2) return true;
  if (!d1 || !d2) return false; // one is empty and they are not both empty

  // Substring check
  if (d1.includes(d2) || d2.includes(d1)) return true;

  // Levenshtein distance check
  // WHY: A threshold of 3 characters balances catching small typos/abbreviations
  // and avoiding false positives between completely different payee descriptions.
  return getLevenshteinDistance(d1, d2) <= 3;
}

export function detectDuplicateGroups(transactions: Transaction[], fuzzy: boolean = false): DuplicateGroup[] {
  // 1. Group by exact (date, payee, amount) key
  const exactGroups: Record<string, Transaction[]> = {};

  for (const tx of transactions) {
    const dateStr = new Date(tx.date).toISOString().split('T')[0];
    const payeeKey = tx.payee.toLowerCase().trim();
    const amountKey = tx.amount.toFixed(2);
    const key = `${dateStr}_${payeeKey}_${amountKey}`;

    if (!exactGroups[key]) {
      exactGroups[key] = [];
    }
    exactGroups[key].push(tx);
  }

  const resultGroups: DuplicateGroup[] = [];

  // 2. Refine groups
  for (const [key, txs] of Object.entries(exactGroups)) {
    if (txs.length < 2) continue;

    // Sort by transaction ID to keep partitioning deterministic
    // WHY: Using ID sorting (lexicographical comparison) provides a stable tiebreaker
    // for fuzzy partitioning and identifying the primary transaction to keep.
    const sortedTxs = [...txs].sort((a, b) => a.id.localeCompare(b.id));

    if (!fuzzy) {
      // Non-fuzzy mode: group everything sharing same (date, payee, amount)
      const first = sortedTxs[0];
      resultGroups.push({
        id: key,
        date: new Date(first.date),
        payee: first.payee.trim(),
        amount: first.amount,
        transactions: sortedTxs,
      });
    } else {
      // Fuzzy mode: partition transactions where descriptions are similar
      const partitions: Transaction[][] = [];

      for (const tx of sortedTxs) {
        let placed = false;
        for (const part of partitions) {
          // Check if this transaction is similar to at least one transaction in the partition
          if (part.some(existingTx => areDescriptionsSimilar(tx.description, existingTx.description))) {
            part.push(tx);
            placed = true;
            break;
          }
        }
        if (!placed) {
          partitions.push([tx]);
        }
      }

      // Keep only groups with length >= 2
      let subGroupIndex = 0;
      for (const part of partitions) {
        if (part.length >= 2) {
          const first = part[0];
          resultGroups.push({
            id: partitions.length > 1 ? `${key}_${subGroupIndex++}` : key,
            date: new Date(first.date),
            payee: first.payee.trim(),
            amount: first.amount,
            transactions: part,
          });
        }
      }
    }
  }

  // 3. Sort by date descending
  return resultGroups.sort((a, b) => b.date.getTime() - a.date.getTime());
}
