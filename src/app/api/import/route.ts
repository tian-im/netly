import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV } from '@/lib/csv';
import { matchRule } from '@/lib/rules';
import { seedDefaultCategoriesIfEmpty } from '@/lib/default-categories';
import { makeHash, disambiguateDescriptions } from '@/lib/import-utils';
import { verifyCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp, checkPayloadSize } from '@/lib/request-utils';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    const url = new URL(request.url);
    await auditLog('CSRF_FAILURE', `endpoint=${url.pathname}`);
    return NextResponse.json(
      { success: false, error: 'CSRF verification failed', errorCode: 'ERR_CSRF_FAILED' },
      { status: 403 }
    );
  }

  if (!checkPayloadSize(request, 4 * 1024 * 1024)) { // 4MB limit
    return NextResponse.json(
      { success: false, error: 'Payload too large', errorCode: 'ERR_PAYLOAD_TOO_LARGE' },
      { status: 413 }
    );
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`import-api:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { success: false, error: 'Too many import requests', errorCode: 'ERR_RATE_LIMITED' },
      { status: 429 }
    );
  }

  try {
    const { csvText, accountId, headerMap, dateFormatHint, hasHeaders } = await request.json();

    if (!csvText || !accountId || !headerMap) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: csvText, accountId, headerMap', errorCode: 'ERR_IMPORT_MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 1. Check if Account exists
    const account = await db.account.findUnique({
      where: { id: accountId }
    });
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Target account not found', errorCode: 'ERR_IMPORT_ACCOUNT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Self-healing categories seed
    await seedDefaultCategoriesIfEmpty(db);

    // 3. Load all categories and categorization rules for rule matching
    const categories = await db.category.findMany();
    const rules = await db.categoryRule.findMany({
      include: { category: true }
    });

    // 4. Parse CSV text
    const parsedTx = parseCSV(csvText, headerMap, dateFormatHint, hasHeaders !== false);
    if (parsedTx.length === 0) {
      return NextResponse.json({
        success: true,
        importedCount: 0,
        skippedCount: 0,
        message: 'No transactions found or parsed from CSV'
      });
    }

    // 5. Batch-level disambiguation: within a single CSV import, if two transactions
    // have the exact same (date, payee, amount, description), automatically append
    // " (2)", " (3)", etc. to the description to differentiate them.
    // This handles bank CSVs where same-day same-merchant transactions have identical descriptions.
    disambiguateDescriptions(parsedTx);

    // 6. Batch duplicate check: find min and max date to load existing records in date range
    const dates = parsedTx.map((tx) => tx.date.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const existingTransactions = await db.transaction.findMany({
      where: {
        accountId,
        date: {
          gte: minDate,
          lte: maxDate,
        }
      }
    });

    const existingSet = new Set(
      existingTransactions.map((tx) => makeHash(tx.date, tx.payee, tx.amount, tx.description))
    );

    // 6. Iterate, rule-match, check duplicates and save new records
    let importedCount = 0;
    let skippedCount = 0;

    const newTransactionsData: any[] = [];

    for (const tx of parsedTx) {
      const hash = makeHash(tx.date, tx.payee, tx.amount, tx.description);
      if (existingSet.has(hash)) {
        skippedCount++;
        continue;
      }

      // Run categorization rules engine
      const matchedCategoryId = matchRule(tx.payee, tx.description, rules);

      newTransactionsData.push({
        date: tx.date,
        payee: tx.payee,
        description: tx.description,
        amount: Math.round(tx.amount * 100) / 100,
        accountId,
        categoryId: matchedCategoryId,
        isReviewed: matchedCategoryId !== null, // auto-mark reviewed if rule matched
      });
      importedCount++;
    }

    // SQLite bulk create: SQLite has parameter limits, insert in batches of 100
    if (newTransactionsData.length > 0) {
      const batchSize = 100;
      await db.$transaction(async (tx) => {
        for (let i = 0; i < newTransactionsData.length; i += batchSize) {
          const batch = newTransactionsData.slice(i, i + batchSize);
          // Prisma createMany is supported in SQLite
          await tx.transaction.createMany({
            data: batch
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      minDate: parsedTx.length > 0 ? minDate.toISOString() : null,
      maxDate: parsedTx.length > 0 ? maxDate.toISOString() : null,
      message: `Successfully imported ${importedCount} transactions. Skipped ${skippedCount} duplicate(s).`
    });

  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred during import.', errorCode: 'ERR_IMPORT_INTERNAL' },
      { status: 500 }
    );
  }
}
