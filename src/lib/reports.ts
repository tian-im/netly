export interface AccountLike {
  id: string;
  name: string;
  type: string; // "ASSET" | "LIABILITY"
  startingBalance: number;
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
  
  // Calculate running balances for each account up to endDate
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

  // Group by category name (excluding TRANSFER)
  const categorySums: Record<string, { type: string; sum: number }> = {};
  
  for (const tx of rangeTransactions) {
    const category = tx.category!;
    if (category.type === 'TRANSFER') continue;

    if (!categorySums[category.name]) {
      categorySums[category.name] = { type: category.type, sum: 0 };
    }
    categorySums[category.name].sum += tx.amount;
  }

  const income: { name: string; amount: number }[] = [];
  const expenses: { name: string; amount: number }[] = [];

  for (const [name, data] of Object.entries(categorySums)) {
    if (data.type === 'INCOME') {
      income.push({ name, amount: data.sum });
    } else if (data.type === 'EXPENSE') {
      expenses.push({ name, amount: -data.sum }); // reported as positive spending
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
  
  const cfSections = {
    OPERATING: { inflow: 0, outflow: 0, net: 0 },
    INVESTING: { inflow: 0, outflow: 0, net: 0 },
    FINANCING: { inflow: 0, outflow: 0, net: 0 },
  };

  for (const tx of rangeTransactions) {
    const category = tx.category!;
    if (category.type === 'TRANSFER') continue;

    const cfType = category.cashFlowType as typeof cashFlowTypes[number];
    if (!cfSections[cfType]) continue;

    if (tx.amount > 0) {
      cfSections[cfType].inflow += tx.amount;
    } else {
      cfSections[cfType].outflow += -tx.amount; // reported as positive outflow
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
