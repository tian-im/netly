import { describe, it, expect } from 'vitest';
import { detectDuplicateGroups, areDescriptionsSimilar } from './duplicates';
import { Transaction } from '@/app/transactions/types';

// Helper to create a minimal transaction mock
function makeMockTx(overrides: Partial<Transaction> = {}): Transaction {
  const account = {
    id: overrides.accountId || 'acc_1',
    name: 'Checking',
    type: 'ASSET',
    currency: 'AUD',
    startingBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    id: overrides.id || crypto.randomUUID(),
    date: overrides.date || new Date('2026-06-01T00:00:00.000Z'),
    payee: overrides.payee || 'Uber',
    description: overrides.description === undefined ? 'Uber Trip' : overrides.description,
    amount: overrides.amount === undefined ? -12.5 : overrides.amount,
    accountId: overrides.accountId || 'acc_1',
    categoryId: overrides.categoryId || null,
    isReviewed: overrides.isReviewed || false,
    createdAt: new Date(),
    updatedAt: new Date(),
    account,
    category: null,
  } as Transaction;
}

describe('areDescriptionsSimilar', () => {
  it('identifies exact description matches', () => {
    expect(areDescriptionsSimilar('Uber Trip', 'Uber Trip')).toBe(true);
    expect(areDescriptionsSimilar('  Uber Trip  ', 'uber trip')).toBe(true);
  });

  it('identifies substring match', () => {
    expect(areDescriptionsSimilar('Uber Trip', 'Uber Trip 01/15')).toBe(true);
    expect(areDescriptionsSimilar('Uber Trip 01/15', 'Uber Trip')).toBe(true);
  });

  it('identifies Levenshtein distance <= 3', () => {
    // Levenshtein distance of 3 (dist between 'Uber Trip' and 'Ubee Triy')
    expect(areDescriptionsSimilar('Uber Trip', 'Ubee Triy')).toBe(true);
    // Levenshtein distance of 4 (dist between 'Uber Trip' and 'Lyft Trip', neither is a substring)
    expect(areDescriptionsSimilar('Uber Trip', 'Lyft Trip')).toBe(false);
  });

  it('handles empty descriptions correctly', () => {
    expect(areDescriptionsSimilar(null, null)).toBe(true);
    expect(areDescriptionsSimilar('', null)).toBe(true);
    expect(areDescriptionsSimilar('Uber Trip', null)).toBe(false);
  });
});

describe('detectDuplicateGroups', () => {
  it('returns empty array when no duplicates exist', () => {
    const tx1 = makeMockTx({ id: '1', payee: 'Uber', amount: -12.5 });
    const tx2 = makeMockTx({ id: '2', payee: 'Coles', amount: -50.0 });
    const groups = detectDuplicateGroups([tx1, tx2]);
    expect(groups).toEqual([]);
  });

  it('groups exact matches by date, payee, amount', () => {
    const tx1 = makeMockTx({ id: '1', description: 'Uber Trip A' });
    const tx2 = makeMockTx({ id: '2', description: 'Uber Trip B' });
    const groups = detectDuplicateGroups([tx1, tx2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].transactions).toHaveLength(2);
    expect(groups[0].payee).toBe('Uber');
    expect(groups[0].amount).toBe(-12.5);
  });

  it('handles three-way duplicate', () => {
    const tx1 = makeMockTx({ id: '1' });
    const tx2 = makeMockTx({ id: '2' });
    const tx3 = makeMockTx({ id: '3' });
    const groups = detectDuplicateGroups([tx1, tx2, tx3]);
    expect(groups).toHaveLength(1);
    expect(groups[0].transactions).toHaveLength(3);
  });

  it('separates clusters based on key', () => {
    const tx1 = makeMockTx({ id: '1', payee: 'Uber', amount: -12.5 });
    const tx2 = makeMockTx({ id: '2', payee: 'Uber', amount: -12.5 });
    const tx3 = makeMockTx({ id: '3', payee: 'Coles', amount: -50.0 });
    const tx4 = makeMockTx({ id: '4', payee: 'Coles', amount: -50.0 });
    
    const groups = detectDuplicateGroups([tx1, tx2, tx3, tx4]);
    expect(groups).toHaveLength(2);
  });

  it('ignores same payee/amount on different dates', () => {
    const tx1 = makeMockTx({ id: '1', date: new Date('2026-06-01') });
    const tx2 = makeMockTx({ id: '2', date: new Date('2026-06-02') });
    const groups = detectDuplicateGroups([tx1, tx2]);
    expect(groups).toEqual([]);
  });

  it('applies fuzzy filtering of descriptions when enabled', () => {
    const tx1 = makeMockTx({ id: '1', description: 'Uber Trip A' });
    const tx2 = makeMockTx({ id: '2', description: 'Uber Trip B' }); // Similar (dist = 1)
    const tx3 = makeMockTx({ id: '3', description: 'A completely different desc' }); // Not similar

    const groupsNonFuzzy = detectDuplicateGroups([tx1, tx2, tx3], false);
    expect(groupsNonFuzzy).toHaveLength(1);
    expect(groupsNonFuzzy[0].transactions).toHaveLength(3);

    const groupsFuzzy = detectDuplicateGroups([tx1, tx2, tx3], true);
    expect(groupsFuzzy).toHaveLength(1);
    expect(groupsFuzzy[0].transactions).toHaveLength(2); // Only tx1 and tx2 grouped
    expect(groupsFuzzy[0].transactions.map(t => t.id)).toContain('1');
    expect(groupsFuzzy[0].transactions.map(t => t.id)).toContain('2');
  });

  it('applies fuzzy filtering with all transactions in a single partition', () => {
    const tx1 = makeMockTx({ id: '1', description: 'Uber Trip A' });
    const tx2 = makeMockTx({ id: '2', description: 'Uber Trip B' });
    const groups = detectDuplicateGroups([tx1, tx2], true);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).not.toContain('_0'); // Uses exact group key without partition index
  });

  it('sorts groups by date descending', () => {
    const tx1 = makeMockTx({ id: '1', date: new Date('2026-06-01') });
    const tx2 = makeMockTx({ id: '2', date: new Date('2026-06-01') });
    
    const tx3 = makeMockTx({ id: '3', date: new Date('2026-06-05') });
    const tx4 = makeMockTx({ id: '4', date: new Date('2026-06-05') });

    const groups = detectDuplicateGroups([tx1, tx2, tx3, tx4]);
    expect(groups).toHaveLength(2);
    expect(groups[0].date.toISOString().split('T')[0]).toBe('2026-06-05');
    expect(groups[1].date.toISOString().split('T')[0]).toBe('2026-06-01');
  });
});
