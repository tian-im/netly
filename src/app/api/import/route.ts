import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSV } from '@/lib/csv';
import { matchRule } from '@/lib/rules';

// Default categories configuration
const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', patterns: ['salary', 'paycheck', 'payroll', 'direct deposit'] },
  { name: 'Groceries', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['woolworths', 'coles', 'aldi', 'grocer', 'supermarket'] },
  { name: 'Utilities & Internet', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['agl', 'electricity', 'water board', 'optus', 'telstra', 'tpg'] },
  { name: 'Subscriptions', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['netflix', 'spotify', 'youtube premium', 'aws', 'github', 'icloud'] },
  { name: 'Rent & Mortgage', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['rent', 'mortgage', 'real estate', 'housing'] },
  { name: 'Transport & Travel', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['uber', 'taxi', 'petrol', 'caltex', 'shell', 'bp', 'opal', 'train', 'flight'] },
  { name: 'Investments', type: 'EXPENSE', cashFlowType: 'INVESTING', patterns: ['brokerage', 'coinbase', 'shares', 'vanguard', 'stock'] },
  { name: 'Loan Payments', type: 'EXPENSE', cashFlowType: 'FINANCING', patterns: ['loan repayment', 'repayment', 'loan interest'] },
  { name: 'Transfer', type: 'TRANSFER', cashFlowType: 'OPERATING', patterns: ['transfer', 'internal transfer', 'tfr'] }
];

export async function POST(req: Request) {
  try {
    const { csvText, accountId, headerMap, dateFormatHint } = await req.json();

    if (!csvText || !accountId || !headerMap) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: csvText, accountId, headerMap' },
        { status: 400 }
      );
    }

    // 1. Check if Account exists
    const account = await db.account.findUnique({
      where: { id: accountId }
    });
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Target account not found' },
        { status: 404 }
      );
    }

    // 2. Self-healing categories seed
    const categoryCount = await db.category.count();
    if (categoryCount === 0) {
      await db.$transaction(async (tx) => {
        for (const defaultCat of DEFAULT_CATEGORIES) {
          const cat = await tx.category.create({
            data: {
              name: defaultCat.name,
              type: defaultCat.type,
              cashFlowType: defaultCat.cashFlowType,
            }
          });
          
          // Seed initial keyword match rules
          for (const pattern of defaultCat.patterns) {
            await tx.categoryRule.create({
              data: {
                pattern,
                categoryId: cat.id
              }
            });
          }
        }
      });
    }

    // 3. Load all categories and categorization rules for rule matching
    const categories = await db.category.findMany();
    const rules = await db.categoryRule.findMany({
      include: { category: true }
    });

    // 4. Parse CSV text
    const parsedTx = parseCSV(csvText, headerMap, dateFormatHint);
    if (parsedTx.length === 0) {
      return NextResponse.json({
        success: true,
        importedCount: 0,
        skippedCount: 0,
        message: 'No transactions found or parsed from CSV'
      });
    }

    // 5. Batch duplicate check: find min and max date to load existing records in date range
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

    // Generate unique lookup hash for existing transactions
    // SQLite stores dates as ISO strings/integers, let's normalize check key
    const makeHash = (date: Date, payee: string, amount: number) => {
      const dateStr = date.toISOString().split('T')[0]; // compare purely by calendar day
      const roundedAmount = Math.round(amount * 100) / 100;
      return `${dateStr}_${payee.toLowerCase().trim()}_${roundedAmount.toFixed(2)}`;
    };

    const existingSet = new Set(
      existingTransactions.map((tx) => makeHash(tx.date, tx.payee, tx.amount))
    );

    // 6. Iterate, rule-match, check duplicates and save new records
    let importedCount = 0;
    let skippedCount = 0;

    const newTransactionsData: any[] = [];

    for (const tx of parsedTx) {
      const hash = makeHash(tx.date, tx.payee, tx.amount);
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
      message: `Successfully imported ${importedCount} transactions. Skipped ${skippedCount} duplicate(s).`
    });

  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
