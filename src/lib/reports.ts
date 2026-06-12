export interface AccountLike {
  id: string;
  name: string;
  type: string; // "ASSET" | "LIABILITY"
  startingBalance: number;
  currency?: string;
}

export interface CategoryLike {
  id: string;
  name: string;
  type: string; // "INCOME" | "EXPENSE" | "TRANSFER"
  cashFlowType: string; // "OPERATING" | "INVESTING" | "FINANCING"
}

export interface TransactionLike {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  categoryId: string | null;
  category: CategoryLike | null;
  currency?: string;
}

/**
 * Generates the Balance Sheet up to a specified end date.
 */
export function generateBalanceSheet(
  accounts: AccountLike[],
  transactions: TransactionLike[],
  endDate: Date
) {
  const parsedEndDate = new Date(endDate);
  const endMs = parsedEndDate.getTime();

  // Index transactions by accountId for O(N) retrieval
  const txsByAccount: Record<string, TransactionLike[]> = {};
  for (const tx of transactions) {
    if (!txsByAccount[tx.accountId]) {
      txsByAccount[tx.accountId] = [];
    }
    txsByAccount[tx.accountId].push(tx);
  }
  
  // Calculate running balances for each account up to endDate
  const accountBalances = accounts.map((account) => {
    const accTransactions = txsByAccount[account.id] || [];
    let netChange = 0;
    
    for (const tx of accTransactions) {
      const txMs = tx.date instanceof Date ? tx.date.getTime() : new Date(tx.date).getTime();
      if (txMs <= endMs) {
        netChange += tx.amount;
      }
    }
    
    const rawBalance = account.startingBalance + netChange;
    const balance = account.type === 'LIABILITY' ? -rawBalance : rawBalance;

    return {
      ...account,
      balance,
    };
  });

  const totals: Record<string, { totalAssets: number; totalLiabilities: number; netWorth: number }> = {};

  for (const account of accountBalances) {
    const currency = account.currency || 'AUD';
    if (!totals[currency]) {
      totals[currency] = { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
    }

    if (account.type === 'ASSET') {
      totals[currency].totalAssets += account.balance;
    } else if (account.type === 'LIABILITY') {
      totals[currency].totalLiabilities += account.balance;
    }
  }

  for (const currency of Object.keys(totals)) {
    totals[currency].netWorth = totals[currency].totalAssets - totals[currency].totalLiabilities;
  }

  return {
    accounts: accountBalances,
    totals,
  };
}

/**
 * Generates the Income & Expense Statement for a given date range.
 */
export function generateIncomeStatement(
  transactions: TransactionLike[],
  startDate: Date,
  endDate: Date
) {
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  const rangeTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= parsedStartDate && txDate <= parsedEndDate && tx.category !== null;
  });

  // Find all unique currencies to initialize empty state
  const uniqueCurrencies = new Set<string>();
  for (const tx of transactions) {
    uniqueCurrencies.add(tx.currency || 'AUD');
  }

  const totals: Record<
    string,
    {
      income: { name: string; amount: number; categoryId: string }[];
      expenses: { name: string; amount: number; categoryId: string }[];
      totalIncome: number;
      totalExpenses: number;
      netIncome: number;
    }
  > = {};

  uniqueCurrencies.forEach((currency) => {
    totals[currency] = {
      income: [],
      expenses: [],
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
    };
  });

  // Group by currency, then by category name (excluding TRANSFER)
  // Track categoryId alongside sum for building drill-down links
  const currencyGrouped: Record<string, Record<string, { type: string; sum: number; categoryId: string }>> = {};
  
  for (const tx of rangeTransactions) {
    const currency = tx.currency || 'AUD';
    const category = tx.category!;
    if (category.type === 'TRANSFER') continue;

    if (!currencyGrouped[currency]) {
      currencyGrouped[currency] = {};
    }

    if (!currencyGrouped[currency][category.name]) {
      currencyGrouped[currency][category.name] = { type: category.type, sum: 0, categoryId: category.id };
    }
    currencyGrouped[currency][category.name].sum += tx.amount;
  }

  for (const [currency, categorySums] of Object.entries(currencyGrouped)) {
    const income: { name: string; amount: number; categoryId: string }[] = [];
    const expenses: { name: string; amount: number; categoryId: string }[] = [];

    for (const [name, data] of Object.entries(categorySums)) {
      if (data.type === 'INCOME') {
        income.push({ name, amount: data.sum, categoryId: data.categoryId });
      } else if (data.type === 'EXPENSE') {
        expenses.push({ name, amount: -data.sum, categoryId: data.categoryId }); // reported as positive spending
      }
    }

    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    totals[currency] = {
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netIncome,
    };
  }

  return {
    totals,
  };
}

/**
 * Generates the Cash Flow Statement for a given date range using the Direct Method.
 */
export function generateCashFlowStatement(
  transactions: TransactionLike[],
  startDate: Date,
  endDate: Date
) {
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  const rangeTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= parsedStartDate && txDate <= parsedEndDate && tx.category !== null;
  });

  const cashFlowTypes = ['OPERATING', 'INVESTING', 'FINANCING'] as const;

  // Find all unique currencies to initialize empty state
  const uniqueCurrencies = new Set<string>();
  for (const tx of transactions) {
    uniqueCurrencies.add(tx.currency || 'AUD');
  }

  const totals: Record<
    string,
    {
      operating: { inflow: number; outflow: number; net: number };
      investing: { inflow: number; outflow: number; net: number };
      financing: { inflow: number; outflow: number; net: number };
      netCashFlow: number;
    }
  > = {};

  uniqueCurrencies.forEach((currency) => {
    totals[currency] = {
      operating: { inflow: 0, outflow: 0, net: 0 },
      investing: { inflow: 0, outflow: 0, net: 0 },
      financing: { inflow: 0, outflow: 0, net: 0 },
      netCashFlow: 0,
    };
  });
  
  const currencyGrouped: Record<
    string,
    {
      OPERATING: { inflow: number; outflow: number; net: number };
      INVESTING: { inflow: number; outflow: number; net: number };
      FINANCING: { inflow: number; outflow: number; net: number };
    }
  > = {};

  uniqueCurrencies.forEach((currency) => {
    currencyGrouped[currency] = {
      OPERATING: { inflow: 0, outflow: 0, net: 0 },
      INVESTING: { inflow: 0, outflow: 0, net: 0 },
      FINANCING: { inflow: 0, outflow: 0, net: 0 },
    };
  });

  for (const tx of rangeTransactions) {
    const currency = tx.currency || 'AUD';
    const category = tx.category!;
    if (category.type === 'TRANSFER') continue;

    const cfType = category.cashFlowType as typeof cashFlowTypes[number];
    if (!currencyGrouped[currency] || !currencyGrouped[currency][cfType]) continue;

    if (tx.amount > 0) {
      currencyGrouped[currency][cfType].inflow += tx.amount;
    } else {
      currencyGrouped[currency][cfType].outflow += -tx.amount; // reported as positive outflow
    }
    currencyGrouped[currency][cfType].net += tx.amount;
  }

  for (const [currency, cfSections] of Object.entries(currencyGrouped)) {
    const netCashFlow =
      cfSections.OPERATING.net + cfSections.INVESTING.net + cfSections.FINANCING.net;

    totals[currency] = {
      operating: cfSections.OPERATING,
      investing: cfSections.INVESTING,
      financing: cfSections.FINANCING,
      netCashFlow,
    };
  }

  return {
    totals,
  };
}

/**
 * Shape of a database transaction record as returned by Prisma's `findMany`
 * with `{ include: { account: true, category: true } }`.
 * The `currency` field is optional because some callers (e.g. test mocks)
 * include it directly, while Prisma always provides it via `account.currency`.
 */
export interface DbTransactionRecord {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  categoryId: string | null;
  currency?: string;
  account?: { currency?: string } | null;
  category?: {
    id: string;
    name: string;
    type: string;
    cashFlowType: string;
  } | null;
}

/** Client-safe shape after mapping. */
export interface ClientTransaction {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  currency: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    type: string;
    cashFlowType: string;
  } | null;
}

/**
 * Maps a database transaction record with relationships to a clean, serializable client-friendly shape.
 */
export function mapTransactionForClient(t: DbTransactionRecord): ClientTransaction {
  return {
    id: t.id,
    date: t.date,
    amount: t.amount,
    accountId: t.accountId,
    currency: t.account?.currency || t.currency || 'AUD',
    categoryId: t.categoryId,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          type: t.category.type,
          cashFlowType: t.category.cashFlowType,
        }
      : null,
  };
}

