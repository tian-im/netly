import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from '../src/lib/reports';

const prisma = new PrismaClient();

function cleanAmount(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,\s]/g, ''));
}

async function main() {
  console.log('Resetting database...');
  await prisma.$transaction([
    prisma.categoryRule.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.category.deleteMany(),
    prisma.account.deleteMany()
  ]);

  console.log('Creating bank account...');
  const account = await prisma.account.create({
    data: {
      name: 'Checking Account 415744546',
      type: 'ASSET',
      startingBalance: 89.97
    }
  });

  const csvPath = path.join(__dirname, 'Transactions.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Transactions.csv not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('Parsing CSV statements...');
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(`Failed to parse CSV: ${parseResult.errors[0].message}`);
  }

  console.log(`Found ${parseResult.data.length} records. Seeding categories & transactions...`);

  const categoryCache: Record<string, any> = {};

  for (const row of parseResult.data as any[]) {
    const rawDate = row['Date'];
    const rawAmount = row['Amount'];
    const rawCategory = row['Category'] || 'Uncategorized';
    const payee = row['Transaction Details'] || 'Unknown Merchant';
    const description = row['Merchant Name'] || row['Transaction Type'] || null;

    if (!rawDate || !rawAmount) continue;

    const date = new Date(rawDate);
    const amount = cleanAmount(rawAmount);

    // Dynamic category resolution
    let categoryName = rawCategory.trim();
    if (!categoryCache[categoryName]) {
      let type = 'EXPENSE';
      let cashFlowType = 'OPERATING';

      if (categoryName.toLowerCase() === 'income') {
        type = 'INCOME';
      } else if (categoryName.toLowerCase() === 'refund') {
        type = 'INCOME';
      } else if (
        categoryName.toLowerCase().includes('transfer') ||
        categoryName.toLowerCase().includes('repayment')
      ) {
        type = 'TRANSFER';
      }

      // Special cash flow categories mapping if any (default to OPERATING)
      if (categoryName.toLowerCase().includes('investment')) {
        cashFlowType = 'INVESTING';
      }

      const cat = await prisma.category.create({
        data: {
          name: categoryName,
          type,
          cashFlowType
        }
      });
      categoryCache[categoryName] = cat;
    }

    const cat = categoryCache[categoryName];

    await prisma.transaction.create({
      data: {
        date,
        payee: payee.trim(),
        description,
        amount,
        accountId: account.id,
        categoryId: cat.id,
        isReviewed: true
      }
    });
  }

  console.log('Database seeded successfully.');

  const accounts = await prisma.account.findMany();
  const dbTransactions = await prisma.transaction.findMany({
    include: { category: true, account: true }
  });

  const mappedAccounts = accounts.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance,
    currency: a.currency
  }));

  const mappedTransactions = dbTransactions.map(t => ({
    id: t.id,
    date: new Date(t.date),
    amount: t.amount,
    accountId: t.accountId,
    currency: t.account.currency,
    categoryId: t.categoryId,
    category: t.category ? {
      id: t.category.id,
      name: t.category.name,
      type: t.category.type,
      cashFlowType: t.category.cashFlowType
    } : null
  }));

  const endDate = new Date('2026-06-30');
  const startDate = new Date('2026-01-01');

  const balanceSheet = generateBalanceSheet(mappedAccounts, mappedTransactions, endDate);
  const incomeStatement = generateIncomeStatement(mappedTransactions, startDate, endDate);
  const cashFlowStatement = generateCashFlowStatement(mappedTransactions, startDate, endDate);

  const audTotalsBS = balanceSheet.totals['AUD'] || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
  const audTotalsIS = incomeStatement.totals['AUD'] || { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netIncome: 0 };
  const audTotalsCF = cashFlowStatement.totals['AUD'] || { operating: { net: 0, inflow: 0, outflow: 0 }, investing: { net: 0 }, financing: { net: 0 }, netCashFlow: 0 };

  console.log('\n=========================================');
  console.log('FINANCIAL STATEMENTS REPORT (EXAMPLE DATA)');
  console.log('=========================================');
  
  console.log('\n--- BALANCE SHEET (As of 30 Jun 2026) ---');
  console.log(`Total Assets:      $${audTotalsBS.totalAssets.toFixed(2)}`);
  console.log(`Total Liabilities: $${audTotalsBS.totalLiabilities.toFixed(2)}`);
  console.log(`Net Worth:         $${audTotalsBS.netWorth.toFixed(2)}`);

  console.log('\n--- INCOME & EXPENSE STATEMENT (Jan - Jun 2026) ---');
  console.log('Inflows (Revenue):');
  audTotalsIS.income.forEach(inc => {
    console.log(`  - ${inc.name}: $${inc.amount.toFixed(2)}`);
  });
  console.log(`Total Income:      $${audTotalsIS.totalIncome.toFixed(2)}`);
  
  console.log('Outflows (Expenses):');
  audTotalsIS.expenses.forEach(exp => {
    console.log(`  - ${exp.name}: $${exp.amount.toFixed(2)}`);
  });
  console.log(`Total Expenses:    $${audTotalsIS.totalExpenses.toFixed(2)}`);
  console.log(`Net Income:        $${audTotalsIS.netIncome.toFixed(2)}`);

  console.log('\n--- CASH FLOW STATEMENT (Direct Method) ---');
  console.log(`Operating Cash Flows: $${audTotalsCF.operating.net.toFixed(2)}`);
  console.log(`  - Inflows:  $${audTotalsCF.operating.inflow.toFixed(2)}`);
  console.log(`  - Outflows: $${audTotalsCF.operating.outflow.toFixed(2)}`);
  console.log(`Investing Cash Flows: $${audTotalsCF.investing.net.toFixed(2)}`);
  console.log(`Financing Cash Flows: $${audTotalsCF.financing.net.toFixed(2)}`);
  console.log(`Net Cash Flow:        $${audTotalsCF.netCashFlow.toFixed(2)}`);
  console.log('=========================================');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
