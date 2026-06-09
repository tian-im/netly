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
  console.log('Checking for existing credit card account...');
  let creditAccount = await prisma.account.findFirst({
    where: { name: 'Credit Card ending 7757' }
  });

  if (creditAccount) {
    console.log('Credit card account already exists. Clearing existing credit transactions...');
    await prisma.transaction.deleteMany({
      where: { accountId: creditAccount.id }
    });
  } else {
    console.log('Creating credit card account...');
    creditAccount = await prisma.account.create({
      data: {
        name: 'Credit Card ending 7757',
        type: 'LIABILITY',
        startingBalance: -1000.00
      }
    });
  }

  const csvPath = path.join(__dirname, '..', 'Transactions-credit.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Transactions-credit.csv not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('Parsing credit card CSV statements...');
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(`Failed to parse CSV: ${parseResult.errors[0].message}`);
  }

  console.log(`Found ${parseResult.data.length} credit records. Seeding categories & transactions...`);

  const categoryCache: Record<string, any> = {};
  const existingCategories = await prisma.category.findMany();
  existingCategories.forEach((cat: { id: string; name: string }) => {
    categoryCache[cat.name] = cat;
  });

  for (const row of parseResult.data as any[]) {
    const rawDate = row['Date'];
    const rawAmount = row['Amount'];
    const rawCategory = (row['Category'] || '').trim();
    const payee = row['Transaction Details'] || 'Unknown Merchant';
    const description = row['Merchant Name'] || row['Transaction Type'] || null;

    if (!rawDate || !rawAmount) continue;

    const date = new Date(rawDate);
    const amount = cleanAmount(rawAmount);

    // If no category in CSV, leave uncategorized (null) for manual review
    let categoryId = null;
    let isReviewed = false;

    if (rawCategory) {
      let categoryName = rawCategory;
      if (!categoryCache[categoryName]) {
        let type = 'EXPENSE';
        let cashFlowType = 'OPERATING';

        if (categoryName.toLowerCase() === 'refund') {
          type = 'INCOME';
        } else if (
          categoryName.toLowerCase().includes('transfer') ||
          categoryName.toLowerCase().includes('repayment') ||
          categoryName.toLowerCase().includes('payment')
        ) {
          type = 'TRANSFER';
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

      categoryId = categoryCache[categoryName].id;
      isReviewed = true;
    }

    await prisma.transaction.create({
      data: {
        date,
        payee: payee.trim(),
        description,
        amount,
        accountId: creditAccount.id,
        categoryId,
        isReviewed
      }
    });
  }

  console.log('Credit card transactions imported successfully.');

  // Run reports against ALL accounts
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
  console.log('📊 CONSOLIDATED MULTI-ACCOUNT STATEMENTS');
  console.log('=========================================');
  
  console.log('\n--- BALANCE SHEET (As of 30 Jun 2026) ---');
  balanceSheet.accounts.forEach(acc => {
    console.log(`  - ${acc.name} (${acc.type}): $${(acc as any).balance.toFixed(2)}`);
  });
  console.log(`Total Assets:      $${audTotalsBS.totalAssets.toFixed(2)}`);
  console.log(`Total Liabilities: $${audTotalsBS.totalLiabilities.toFixed(2)}`);
  console.log(`Net Worth:         $${audTotalsBS.netWorth.toFixed(2)}`);

  console.log('\n--- CONSOLIDATED INCOME & EXPENSE STATEMENT ---');
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

  console.log('\n--- CONSOLIDATED CASH FLOW STATEMENT ---');
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
