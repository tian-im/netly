/**
 * Integration tests for POST /api/import
 *
 * These tests exercise the full CSV import pipeline against a real SQLite
 * database (prisma/test.db), covering parameter validation, account lookup,
 * self-healing category seeding, CSV parsing, duplicate detection, and
 * batch insertion.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getTestDb, clearTestDb, disconnectTestDb } from '@/lib/test-db';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { resetRateLimiter } from '@/lib/rate-limiter';

vi.mock('@/lib/db', async () => {
  const { getTestDb } = await import('@/lib/test-db');
  return { db: getTestDb() };
});

const db = getTestDb();

function mockRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/import', () => {
  beforeEach(async () => {
    await clearTestDb();
    resetRateLimiter();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('returns 400 when required parameters are missing', async () => {
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required parameters');
  });

  it('returns 400 when csvText is missing', async () => {
    const res = await POST(mockRequest({ accountId: '123', headerMap: { date: 'D' } }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when accountId is missing', async () => {
    const res = await POST(mockRequest({ csvText: 'a,b,c', headerMap: { date: 'D' } }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when target account does not exist', async () => {
    const res = await POST(mockRequest({
      csvText: 'Date,Payee,Amount\n2026-01-01,Test,100',
      accountId: '00000000-0000-0000-0000-000000000000',
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Target account not found');
  });

  it('returns success with 0 imported for empty CSV', async () => {
    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'AUD' },
    });

    const res = await POST(mockRequest({
      csvText: 'Date,Payee,Amount',
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.importedCount).toBe(0);
  });

  it('imports transactions and auto-seeds default categories on first import', async () => {
    const account = await db.account.create({
      data: { name: 'Checking', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      '2026-01-15,Coles Supermarket,-82.40',
      '2026-01-16,Salary Deposit,2500.00',
      '2026-01-17,Uber Trip,-15.50',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.importedCount).toBe(3);
    expect(data.skippedCount).toBe(0);

    // Verify transactions were created
    const transactions = await db.transaction.findMany({ where: { accountId: account.id } });
    expect(transactions).toHaveLength(3);

    // Verify default categories were auto-seeded
    const categories = await db.category.findMany();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.some(c => c.name === 'Groceries')).toBe(true);
    expect(categories.some(c => c.name === 'Transfer')).toBe(true);

    // Verify rules were auto-seeded
    const rules = await db.categoryRule.findMany();
    expect(rules.length).toBeGreaterThan(0);

    // Verify 'Salary' was auto-categorized as INCOME
    // The rules engine matches 'Salary' → 'Salary' category
    const salaryTx = transactions.find(t => t.payee === 'Salary Deposit');
    expect(salaryTx).toBeDefined();
    expect(salaryTx!.isReviewed).toBe(true);

    // 'Coles Supermarket' should be auto-categorized (matches 'coles' pattern → Groceries)
    const colesTx = transactions.find(t => t.payee === 'Coles Supermarket');
    expect(colesTx).toBeDefined();
    expect(colesTx!.isReviewed).toBe(true);
  });

  it('skips duplicate transactions on re-import', async () => {
    const account = await db.account.create({
      data: { name: 'Checking', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      '2026-02-01,Woolworths,-120.00',
      '2026-02-02,Netflix,-19.99',
    ].join('\n');

    // First import — should import 2
    const res1 = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res1.status).toBe(200);
    expect((await res1.json()).importedCount).toBe(2);

    // Same CSV again — should skip both as duplicates
    const res2 = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.importedCount).toBe(0);
    expect(data2.skippedCount).toBe(2);

    // Verify only 2 total transactions exist
    const count = await db.transaction.count({ where: { accountId: account.id } });
    expect(count).toBe(2);
  });

  it('handles debit/credit split columns', async () => {
    const account = await db.account.create({
      data: { name: 'Credit Card', type: 'LIABILITY', currency: 'AUD' },
    });

    const csvText = [
      'Date,Merchant,Debit,Credit',
      '2026-03-01,Uber,15.50,',
      '2026-03-02,Refund,,50.00',
      '2026-03-03,Transfer,10.00,10.00',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Merchant', debit: 'Debit', credit: 'Credit' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.importedCount).toBe(3);

    const transactions = await db.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { date: 'asc' },
    });

    expect(transactions[0].amount).toBe(-15.5);  // Debit only
    expect(transactions[1].amount).toBe(50);      // Credit only
    expect(transactions[2].amount).toBe(0);        // Both present and equal
  });

  it('handles date format hints', async () => {
    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      '15/01/2026,Test,-100.00',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
      dateFormatHint: 'DD/MM/YYYY',
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.importedCount).toBe(1);

    const tx = await db.transaction.findFirst({ where: { accountId: account.id } });
    expect(tx).toBeDefined();
    expect(tx!.date.getMonth()).toBe(0); // January (0-indexed)
    expect(tx!.date.getDate()).toBe(15);
  });

  it('handles MM/DD/YYYY date format', async () => {
    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'USD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      '01/15/2026,Test,-100.00',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
      dateFormatHint: 'MM/DD/YYYY',
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.importedCount).toBe(1);

    const tx = await db.transaction.findFirst({ where: { accountId: account.id } });
    expect(tx!.date.getMonth()).toBe(0); // January
    expect(tx!.date.getDate()).toBe(15);
  });

  it('handles description column and empty descriptions', async () => {
    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount,Notes',
      '2026-04-01,With Notes,-50.00,Some memo here',
      '2026-04-02,No Notes,200.00,',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount', description: 'Notes' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.importedCount).toBe(2);

    const tx = await db.transaction.findFirst({
      where: { accountId: account.id, payee: 'With Notes' },
    });
    expect(tx!.description).toBe('Some memo here');

    const txNoNotes = await db.transaction.findFirst({
      where: { accountId: account.id, payee: 'No Notes' },
    });
    expect(txNoNotes!.description).toBeNull();
  });

  it('rounds amounts to 2 decimal places', async () => {
    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      '2026-05-01,Precision,12.345',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res.status).toBe(200);

    const tx = await db.transaction.findFirst({ where: { accountId: account.id } });
    expect(tx!.amount).toBe(12.35);
  });

  it('skips rows with missing date or payee', async () => {
    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      ',Missing Date,-10.00',
      '2026-06-01,,50.00',
      '2026-06-02,Valid,30.00',
    ].join('\n');

    const res = await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.importedCount).toBe(1);
  });

  it('does not auto-seed categories again when categories already exist', async () => {
    // Pre-create a single category
    await db.category.create({
      data: { name: 'Custom Cat', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    });

    const account = await db.account.create({
      data: { name: 'Test', type: 'ASSET', currency: 'AUD' },
    });

    const csvText = [
      'Date,Payee,Amount',
      '2026-07-01,Test Payee,-25.00',
    ].join('\n');

    await POST(mockRequest({
      csvText,
      accountId: account.id,
      headerMap: { date: 'Date', payee: 'Payee', amount: 'Amount' },
    }));

    // Should NOT add default categories — only our custom one
    const categories = await db.category.findMany();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Custom Cat');
  });
});
