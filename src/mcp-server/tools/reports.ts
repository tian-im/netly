import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateBalanceSheet, generateIncomeStatement, generateCashFlowStatement } from "@/lib/reports";
import { fetchAndMapData } from "../data";

export function registerReportTools(server: McpServer) {
  server.tool(
    "get_dashboard_summary",
    "Calculate current month's high-level financial metrics: Net Worth (and delta vs prior month), Net Income (and delta), Savings Rate, and Cash Runway.",
    {
      currency: z.string().optional().default("AUD").describe("Visual currency for calculation"),
    },
    async ({ currency }) => {
      try {
        const visualCurrency = currency.toUpperCase();
        const { mappedAccounts, mappedTransactions } = await fetchAndMapData();

        const now = new Date();
        const firstDayOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const firstDayOfPrior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfPrior = new Date(now.getFullYear(), now.getMonth(), 0);

        // Generate reports
        const bs = generateBalanceSheet(mappedAccounts, mappedTransactions, lastDayOfCurrent);
        const prevBS = generateBalanceSheet(mappedAccounts, mappedTransactions, lastDayOfPrior);

        const is = generateIncomeStatement(mappedTransactions, firstDayOfCurrent, lastDayOfCurrent);
        const prevIS = generateIncomeStatement(mappedTransactions, firstDayOfPrior, lastDayOfPrior);

        const cfs = generateCashFlowStatement(mappedTransactions, firstDayOfCurrent, lastDayOfCurrent);

        // Extract selected currency values
        const currentNW = bs.totals[visualCurrency]?.netWorth ?? 0;
        const priorNW = prevBS.totals[visualCurrency]?.netWorth ?? 0;
        const nwDelta = currentNW - priorNW;
        const nwPercentageChange = priorNW !== 0 ? (nwDelta / Math.abs(priorNW)) * 100 : 0;

        const visualIS = is.totals[visualCurrency] || { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netIncome: 0 };
        const prevVisualIS = prevIS.totals[visualCurrency] || { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netIncome: 0 };

        const currentNetIncome = visualIS.netIncome;
        const priorNetIncome = prevVisualIS.netIncome;
        const netIncomeDelta = currentNetIncome - priorNetIncome;
        const netIncomePercentageChange = priorNetIncome !== 0 ? (netIncomeDelta / Math.abs(priorNetIncome)) * 100 : 0;

        const savingsRate = visualIS.totalIncome > 0 ? (currentNetIncome / visualIS.totalIncome) * 100 : 0;

        const visualCF = cfs.totals[visualCurrency] || { operating: { inflow: 0, outflow: 0, net: 0 }, investing: { inflow: 0, outflow: 0, net: 0 }, financing: { inflow: 0, outflow: 0, net: 0 }, netCashFlow: 0 };
        const averageMonthlyCashFlow = visualCF.netCashFlow; // 1 month period
        const isBurn = averageMonthlyCashFlow < 0;
        const liquidAssets = bs.totals[visualCurrency]?.totalAssets ?? 0;
        const runwayMonths = isBurn ? liquidAssets / Math.abs(averageMonthlyCashFlow) : null;

        const metrics = {
          netWorth: {
            current: currentNW,
            prior: priorNW,
            delta: nwDelta,
            percentageChange: nwPercentageChange,
          },
          netIncome: {
            current: currentNetIncome,
            prior: priorNetIncome,
            delta: netIncomeDelta,
            percentageChange: netIncomePercentageChange,
          },
          savingsRate: {
            percentage: savingsRate,
            totalIncome: visualIS.totalIncome,
            totalExpenses: visualIS.totalExpenses,
          },
          cashRunway: {
            isBurn,
            monthlyCashFlow: averageMonthlyCashFlow,
            runwayMonths,
            liquidAssets,
          },
          currency: visualCurrency,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(metrics) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to calculate dashboard summary: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "get_financial_reports",
    "Generate Balance Sheet, Income & Expense Statement, and Statement of Cash Flows for a specified date range. Can optionally include comparative prior period metrics.",
    {
      startDate: z.string().describe("ISO start date string (e.g. '2026-01-01')"),
      endDate: z.string().describe("ISO end date string (e.g. '2026-06-30')"),
      currency: z.string().optional().describe("Filter results by currency"),
      includePriorPeriod: z.boolean().optional().default(false).describe("If true, returns same-duration prior period reports for comparison"),
    },
    async ({ startDate, endDate, currency, includePriorPeriod }) => {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const { mappedAccounts, mappedTransactions } = await fetchAndMapData();

        const balanceSheet = generateBalanceSheet(mappedAccounts, mappedTransactions, end);
        const incomeStatement = generateIncomeStatement(mappedTransactions, start, end);
        const cashFlowStatement = generateCashFlowStatement(mappedTransactions, start, end);

        let bsAccounts = balanceSheet.accounts;
        let bsTotals = balanceSheet.totals;
        let isTotals = incomeStatement.totals;
        let cfsTotals = cashFlowStatement.totals;

        if (currency) {
          const upper = currency.toUpperCase();
          bsAccounts = bsAccounts.filter((a) => a.currency === upper);
          bsTotals = bsTotals[upper] ? { [upper]: bsTotals[upper] } : {};
          isTotals = isTotals[upper] ? { [upper]: isTotals[upper] } : {};
          cfsTotals = cfsTotals[upper] ? { [upper]: cfsTotals[upper] } : {};
        }

        let priorPeriod = null;
        if (includePriorPeriod) {
          const duration = end.getTime() - start.getTime();
          const priorStart = new Date(start.getTime() - duration);
          const priorEnd = new Date(end.getTime() - duration);

          const priorBS = generateBalanceSheet(mappedAccounts, mappedTransactions, priorEnd);
          const priorIS = generateIncomeStatement(mappedTransactions, priorStart, priorEnd);
          const priorCFs = generateCashFlowStatement(mappedTransactions, priorStart, priorEnd);

          let pBsAccounts = priorBS.accounts;
          let pBsTotals = priorBS.totals;
          let pIsTotals = priorIS.totals;
          let pCfsTotals = priorCFs.totals;

          if (currency) {
            const upper = currency.toUpperCase();
            pBsAccounts = pBsAccounts.filter((a) => a.currency === upper);
            pBsTotals = pBsTotals[upper] ? { [upper]: pBsTotals[upper] } : {};
            pIsTotals = pIsTotals[upper] ? { [upper]: pIsTotals[upper] } : {};
            pCfsTotals = pCfsTotals[upper] ? { [upper]: pCfsTotals[upper] } : {};
          }

          priorPeriod = {
            balanceSheet: { accounts: pBsAccounts, totals: pBsTotals },
            incomeStatement: { totals: pIsTotals },
            cashFlowStatement: { totals: pCfsTotals },
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                balanceSheet: { accounts: bsAccounts, totals: bsTotals },
                incomeStatement: { totals: isTotals },
                cashFlowStatement: { totals: cfsTotals },
                priorPeriod,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to compile reports: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "get_net_worth_trend",
    "Query historical net worth data points over trailing periods (months or quarters).",
    {
      months: z.number().optional().default(12).describe("Lookback window in months"),
      currency: z.string().optional().default("AUD").describe("Visual currency for calculation"),
    },
    async ({ months, currency }) => {
      try {
        const lookbackMonths = months ?? 12;
        const visualCurrency = (currency ?? "AUD").toUpperCase();
        const { mappedAccounts, mappedTransactions } = await fetchAndMapData();

        const now = new Date();
        const trendPoints: { date: string; netWorth: number; totalAssets: number; totalLiabilities: number }[] = [];

        for (let i = lookbackMonths - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

          const tempBS = generateBalanceSheet(mappedAccounts, mappedTransactions, monthEnd);
          const totals = tempBS.totals[visualCurrency] || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };

          trendPoints.push({
            date: monthEnd.toISOString().split("T")[0],
            netWorth: totals.netWorth,
            totalAssets: totals.totalAssets,
            totalLiabilities: totals.totalLiabilities,
          });
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ dataPoints: trendPoints, currency: visualCurrency }) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to calculate net worth trend: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "get_income_expense_breakdown",
    "Retrieve breakdown of spending or earnings by category with percentage distribution.",
    {
      startDate: z.string().describe("ISO start date string"),
      endDate: z.string().describe("ISO end date string"),
      type: z.enum(["INCOME", "EXPENSE"]).describe("Filter categories by type"),
      currency: z.string().optional().default("AUD").describe("visual currency"),
    },
    async ({ startDate, endDate, type, currency }) => {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const visualCurrency = currency.toUpperCase();

        const transactionsList = await db.transaction.findMany({
          where: {
            date: { gte: start, lte: end },
            account: { currency: visualCurrency },
            category: { type },
          },
          include: { category: true },
        });

        // Group by category
        const categoryGroups: Record<string, { id: string; name: string; amount: number }> = {};
        let totalAmount = 0;

        for (const tx of transactionsList) {
          if (!tx.category) continue;
          const cat = tx.category;
          if (!categoryGroups[cat.id]) {
            categoryGroups[cat.id] = { id: cat.id, name: cat.name, amount: 0 };
          }
          // Expenses are positive in reporting representation
          const amt = type === "EXPENSE" ? -tx.amount : tx.amount;
          categoryGroups[cat.id].amount += amt;
          totalAmount += amt;
        }

        const categories = Object.values(categoryGroups).map((c) => ({
          ...c,
          percentage: totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0,
        })).sort((a, b) => b.amount - a.amount);

        return {
          content: [{ type: "text", text: JSON.stringify({ categories, total: totalAmount, currency: visualCurrency }) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to get breakdown: ${error.message || error}` }],
        };
      }
    }
  );
}
