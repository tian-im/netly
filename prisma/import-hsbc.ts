import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

import { cleanAmount, parseBankDate } from '../src/lib/csv';
import { matchRule } from '../src/lib/rules';
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from '../src/lib/reports';

const prisma = new PrismaClient();

interface BalanceSheetAccount {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  currency: string;
  balance: number;
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

  // Strip BOM before parsing to avoid \ufeff prefix on column names
  let csvContent = fs.readFileSync(csvPath, 'utf-8');
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }

  console.log('Parsing HSBC CSV statements...');
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(`Failed to parse CSV: ${parseResult.errors[0].message}`);
  }

  // Fetch all categories and rules from database for auto-categorization.
  // `categories` is used below for fallback keyword matching on descriptions
  // that the rules engine didn't catch (e.g. 'cashback', 'transfer' in description).
  const categories = await prisma.category.findMany();
  const rules = await prisma.categoryRule.findMany();

  console.log(`Found ${parseResult.data.length} HSBC records. Seeding transactions with rules engine...`);

  let uncategorizedCount = 0;
  let categorizedCount = 0;
  let skippedCount = 0;
  // hsbcAccount is guaranteed non-null after the if/else block above
  const accountId = hsbcAccount!.id;
  const newTransactions: {
    date: Date;
    payee: string;
    description: string | null;
    amount: number;
    accountId: string;
    categoryId: string | null;
    isReviewed: boolean;
  }[] = [];

  const importDateStr = new Date().toISOString().split('T')[0];

  for (const row of parseResult.data as Record<string, string>[]) {
    try {
      const rawDate = row['Transaction Date'] || row[Object.keys(row)[0]];
      const rawDescription = row['Description'] || '';
      const rawAmount = row['Amount'];

      if (!rawDate || !rawAmount) continue;

      // Skip rows with no meaningful payee/description content
      const trimmedDesc = rawDescription.trim();
      if (!trimmedDesc) continue;

      // HSBC AU exports dates in DD/MM/YYYY format
      const date = parseBankDate(rawDate, 'DD/MM/YYYY');
      const amount = cleanAmount(rawAmount);

      if (isNaN(amount)) {
        skippedCount++;
        continue;
      }

      // Run rules engine matching (substring + regex patterns from DB)
      let matchedCategoryId = matchRule(trimmedDesc, null, rules);
      
      // Fallback keyword matching for patterns the rules engine didn't catch.
      // This overlaps with rules engine scope — ideally these would be DB rules
      // instead. Note: if the 'refund' or 'transfer' categories don't exist,
      // find() returns undefined and the fallback silently no-ops.
      // We manually lowercase here because matchRule (called above) handles its
      // own internal lowercasing, but this fallback does simple String.includes().
      if (!matchedCategoryId) {
        const descLower = trimmedDesc.toLowerCase();
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

      // HSBC CSVs don't have a separate payee column — the description is the
      // transaction narration (e.g. "Coles Supermarket RICHMOND"). We use it as
      // payee, and store the import timestamp in description for auditability.
      const truncatedPayee = trimmedDesc.substring(0, 100);
      newTransactions.push({
        date,
        payee: truncatedPayee,
        description: `Imported from HSBC on ${importDateStr}`,
        amount,
        accountId,
        categoryId: matchedCategoryId,
        isReviewed: matchedCategoryId !== null
      });
    } catch (e) {
      // Log and skip rows with unparseable dates or other errors,
      // consistent with how parseCSV handles bad rows in the main pipeline.
      console.warn('Skipping HSBC row due to parse error:', e);
      skippedCount++;
    }
  }

  // Batch insert in a single transaction
  if (newTransactions.length > 0) {
    const batchSize = 100;
    await prisma.$transaction(async (prismaTx) => {
      for (let i = 0; i < newTransactions.length; i += batchSize) {
        const batch = newTransactions.slice(i, i + batchSize);
        await prismaTx.transaction.createMany({ data: batch });
      }
    });
  }

  console.log(`HSBC transactions imported: ${categorizedCount} auto-categorized, ${uncategorizedCount} marked for review.${skippedCount > 0 ? ` ${skippedCount} rows skipped due to errors.` : ''}`);

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

  // Local-midnight dates for consistency with the ledger's date handling
  const endDate = new Date(2026, 5, 30);
  const startDate = new Date(2026, 0, 1);

  const balanceSheet = generateBalanceSheet(mappedAccounts, mappedTransactions, endDate);
  const incomeStatement = generateIncomeStatement(mappedTransactions, startDate, endDate);
  const cashFlowStatement = generateCashFlowStatement(mappedTransactions, startDate, endDate);

  // Note: report only shows AUD totals. Non-AUD accounts (e.g. USD savings) are
  // silently excluded from this console printout.
  const audTotalsBS = balanceSheet.totals['AUD'] || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
  const audTotalsIS = incomeStatement.totals['AUD'] || { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netIncome: 0 };
  const audTotalsCF = cashFlowStatement.totals['AUD'] || { operating: { net: 0, inflow: 0, outflow: 0 }, investing: { net: 0 }, financing: { net: 0 }, netCashFlow: 0 };

  console.log('\n=========================================');
  console.log('📊 THREE-ACCOUNT CONSOLIDATED LEDGER REPORT');
  console.log('=========================================');
  
  console.log('\n--- BALANCE SHEET (As of 30 Jun 2026) ---');
  (balanceSheet.accounts as BalanceSheetAccount[]).forEach(acc => {
    console.log(`  - ${acc.name} (${acc.type}): $${acc.balance.toFixed(2)}`);
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
  // Display expenses sorted by amount (copy to avoid mutating the source array)
  [...audTotalsIS.expenses].sort((a,b) => b.amount - a.amount).forEach(exp => {
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
