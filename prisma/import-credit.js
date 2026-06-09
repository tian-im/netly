const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const prisma = new PrismaClient();

function cleanAmount(val) {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,\s]/g, ''));
}

// Inline reports engine functions for local Node execution
function generateBalanceSheet(accounts, transactions, endDate) {
  const parsedEndDate = new Date(endDate);
  
  const accountBalances = accounts.map((account) => {
    const accTransactions = transactions.filter(
      (tx) => tx.accountId === account.id && new Date(tx.date) <= parsedEndDate
    );
    const netChange = accTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const balance = account.startingBalance + netChange;

    return {
      ...account,
      balance,
    };
  });

  const totalAssets = accountBalances
    .filter((a) => a.type === 'ASSET')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accountBalances
    .filter((a) => a.type === 'LIABILITY')
    .reduce((sum, a) => sum + -a.balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  return {
    accounts: accountBalances,
    totalAssets,
    totalLiabilities,
    netWorth,
  };
}

function generateIncomeStatement(transactions, startDate, endDate) {
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  const rangeTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= parsedStartDate && txDate <= parsedEndDate && tx.category !== null;
  });

  const categorySums = {};
  
  for (const tx of rangeTransactions) {
    const category = tx.category;
    if (category.type === 'TRANSFER') continue;

    if (!categorySums[category.name]) {
      categorySums[category.name] = { type: category.type, sum: 0 };
    }
    categorySums[category.name].sum += tx.amount;
  }

  const income = [];
  const expenses = [];

  for (const [name, data] of Object.entries(categorySums)) {
    if (data.type === 'INCOME') {
      income.push({ name, amount: data.sum });
    } else if (data.type === 'EXPENSE') {
      expenses.push({ name, amount: -data.sum });
    }
  }

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netIncome,
  };
}

function generateCashFlowStatement(transactions, startDate, endDate) {
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  const rangeTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= parsedStartDate && txDate <= parsedEndDate && tx.category !== null;
  });

  const cfSections = {
    OPERATING: { inflow: 0, outflow: 0, net: 0 },
    INVESTING: { inflow: 0, outflow: 0, net: 0 },
    FINANCING: { inflow: 0, outflow: 0, net: 0 },
  };

  for (const tx of rangeTransactions) {
    const category = tx.category;
    if (category.type === 'TRANSFER') continue;

    const cfType = category.cashFlowType;
    if (!cfSections[cfType]) continue;

    if (tx.amount > 0) {
      cfSections[cfType].inflow += tx.amount;
    } else {
      cfSections[cfType].outflow += -tx.amount;
    }
    cfSections[cfType].net += tx.amount;
  }

  const netCashFlow =
    cfSections.OPERATING.net + cfSections.INVESTING.net + cfSections.FINANCING.net;

  return {
    operating: cfSections.OPERATING,
    investing: cfSections.INVESTING,
    financing: cfSections.FINANCING,
    netCashFlow,
  };
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

  const categoryCache = {};
  const existingCategories = await prisma.category.findMany();
  existingCategories.forEach(cat => {
    categoryCache[cat.name] = cat;
  });

  for (const row of parseResult.data) {
    const rawDate = row['Date'];
    const rawAmount = row['Amount'];
    const rawCategory = row['Category'] || 'Uncategorised';
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

    const cat = categoryCache[categoryName];

    await prisma.transaction.create({
      data: {
        date,
        payee: payee.trim(),
        description,
        amount,
        accountId: creditAccount.id,
        categoryId: cat.id,
        isReviewed: true
      }
    });
  }

  console.log('Credit card transactions imported successfully.');

  // Run reports against ALL accounts
  const accounts = await prisma.account.findMany();
  const dbTransactions = await prisma.transaction.findMany({
    include: { category: true }
  });

  const mappedAccounts = accounts.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    startingBalance: a.startingBalance
  }));

  const mappedTransactions = dbTransactions.map(t => ({
    id: t.id,
    date: new Date(t.date),
    amount: t.amount,
    accountId: t.accountId,
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

  console.log('\n=========================================');
  console.log('📊 CONSOLIDATED MULTI-ACCOUNT STATEMENTS');
  console.log('=========================================');
  
  console.log('\n--- BALANCE SHEET (As of 30 Jun 2026) ---');
  balanceSheet.accounts.forEach(acc => {
    console.log(`  - ${acc.name} (${acc.type}): $${acc.balance.toFixed(2)}`);
  });
  console.log(`Total Assets:      $${balanceSheet.totalAssets.toFixed(2)}`);
  console.log(`Total Liabilities: $${balanceSheet.totalLiabilities.toFixed(2)}`);
  console.log(`Net Worth:         $${balanceSheet.netWorth.toFixed(2)}`);

  console.log('\n--- CONSOLIDATED INCOME & EXPENSE STATEMENT ---');
  console.log('Inflows (Revenue):');
  incomeStatement.income.forEach(inc => {
    console.log(`  - ${inc.name}: $${inc.amount.toFixed(2)}`);
  });
  console.log(`Total Income:      $${incomeStatement.totalIncome.toFixed(2)}`);
  
  console.log('Outflows (Expenses):');
  incomeStatement.expenses.forEach(exp => {
    console.log(`  - ${exp.name}: $${exp.amount.toFixed(2)}`);
  });
  console.log(`Total Expenses:    $${incomeStatement.totalExpenses.toFixed(2)}`);
  console.log(`Net Income:        $${incomeStatement.netIncome.toFixed(2)}`);

  console.log('\n--- CONSOLIDATED CASH FLOW STATEMENT ---');
  console.log(`Operating Cash Flows: $${cashFlowStatement.operating.net.toFixed(2)}`);
  console.log(`  - Inflows:  $${cashFlowStatement.operating.inflow.toFixed(2)}`);
  console.log(`  - Outflows: $${cashFlowStatement.operating.outflow.toFixed(2)}`);
  console.log(`Investing Cash Flows: $${cashFlowStatement.investing.net.toFixed(2)}`);
  console.log(`Financing Cash Flows: $${cashFlowStatement.financing.net.toFixed(2)}`);
  console.log(`Net Cash Flow:        $${cashFlowStatement.netCashFlow.toFixed(2)}`);
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
