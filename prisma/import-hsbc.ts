import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from '../src/lib/reports';

const prisma = new PrismaClient();

function cleanAmount(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,"\s]/g, ''));
}

// Keep the specific inline rules matching logic
function matchRule(payee: string, description: string | null, rules: any[]) {
  const cleanPayee = payee.toLowerCase();
  const cleanDesc = description ? description.toLowerCase() : '';

  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();
    
    // Substring checks
    if (cleanPayee.includes(pattern) || cleanDesc.includes(pattern)) {
      return rule.categoryId;
    }
  }
  return null;
}

async function main() {
  console.log('Checking for existing HSBC account...');
  let hsbcAccount = await prisma.account.findFirst({
    where: { name: 'HSBC checking account' }
  });

  if (hsbcAccount) {
    console.log('HSBC account already exists. Clearing existing HSBC transactions...');
    await prisma.transaction.deleteMany({
      where: { accountId: hsbcAccount.id }
    });
  } else {
    console.log('Creating HSBC checking account...');
    hsbcAccount = await prisma.account.create({
      data: {
        name: 'HSBC checking account',
        type: 'ASSET',
        startingBalance: 1933.89
      }
    });
  }

  const csvPath = path.join(__dirname, '..', 'HSBC0306.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`HSBC0306.csv not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('Parsing HSBC CSV statements...');
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(`Failed to parse CSV: ${parseResult.errors[0].message}`);
  }

  // Fetch all categories and rules from database for auto-categorization
  const categories = await prisma.category.findMany();
  const rules = await prisma.categoryRule.findMany();

  console.log(`Found ${parseResult.data.length} HSBC records. Seeding transactions with rules engine...`);

  let uncategorizedCount = 0;
  let categorizedCount = 0;

  for (const row of parseResult.data as any[]) {
    const rawDate = row['Transaction Date'] || row['Transaction Date\ufeff'] || row[Object.keys(row)[0]]; // handle potential BOM characters
    const rawDescription = row['Description'] || '';
    const rawAmount = row['Amount'];

    if (!rawDate || !rawAmount) continue;

    const date = new Date(rawDate);
    const amount = cleanAmount(rawAmount);

    if (isNaN(amount)) continue;

    // Run rules engine matching
    let matchedCategoryId = matchRule(rawDescription, null, rules);
    
    // Fallback manual defaults for common keywords inside HSBC description to showcase rules correctness
    if (!matchedCategoryId) {
      const descLower = rawDescription.toLowerCase();
      if (descLower.includes('cashback') || descLower.includes('refund')) {
        const refundCat = categories.find(c => c.name.toLowerCase() === 'refund');
        if (refundCat) matchedCategoryId = refundCat.id;
      } else if (descLower.includes('transfer') || descLower.includes('tfr')) {
        const tfrCat = categories.find(c => c.name.toLowerCase() === 'transfer');
        if (tfrCat) matchedCategoryId = tfrCat.id;
      }
    }

    if (matchedCategoryId) {
      categorizedCount++;
    } else {
      uncategorizedCount++;
    }

    await prisma.transaction.create({
      data: {
        date,
        payee: rawDescription.trim().substring(0, 100),
        description: 'HSBC Import Feed',
        amount,
        accountId: hsbcAccount.id,
        categoryId: matchedCategoryId,
        isReviewed: matchedCategoryId !== null
      }
    });
  }

  console.log(`HSBC transactions imported: ${categorizedCount} auto-categorized, ${uncategorizedCount} marked for review.`);

  // Run reports against ALL accounts (Checking, Credit Card, HSBC)
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
  console.log('📊 THREE-ACCOUNT CONSOLIDATED LEDGER REPORT');
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
  // Sort and display top expenses
  audTotalsIS.expenses.sort((a,b) => b.amount - a.amount).forEach(exp => {
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
