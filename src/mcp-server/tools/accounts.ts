import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateBalanceSheet } from "@/lib/reports";
import { fetchAndMapData } from "../data";

export function registerAccountTools(server: McpServer) {
  server.tool(
    "list_accounts",
    "List all ledger accounts with metadata. Can optionally calculate live balances and summaries.",
    {
      includeBalances: z.boolean().optional().default(false).describe("If true, calculates and includes live balances and totals by currency"),
      currency: z.string().optional().describe("Filter results by currency (e.g. 'AUD', 'USD')"),
    },
    async ({ includeBalances, currency }) => {
      try {
        const queryCurrency = currency ? currency.toUpperCase() : undefined;

        const accounts = await db.account.findMany({
          include: {
            _count: {
              select: { transactions: true },
            },
          },
          orderBy: { name: "asc" },
        });

        // Filter by currency if provided
        const filteredAccounts = queryCurrency
          ? accounts.filter((acc) => acc.currency === queryCurrency)
          : accounts;

        if (!includeBalances) {
          const formatted = filteredAccounts.map((acc) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            startingBalance: acc.startingBalance,
            currency: acc.currency,
            transactionCount: acc._count.transactions,
            createdAt: acc.createdAt.toISOString(),
          }));

          return {
            content: [{ type: "text", text: JSON.stringify({ accounts: formatted }) }],
          };
        }

        const { mappedAccounts, mappedTransactions } = await fetchAndMapData();

        // Compute balances up to today
        const balanceSheet = generateBalanceSheet(mappedAccounts, mappedTransactions, new Date());

        let resultAccounts = balanceSheet.accounts.map((acc) => {
          const original = accounts.find((a) => a.id === acc.id);
          return {
            ...acc,
            transactionCount: original?._count.transactions || 0,
          };
        });

        let resultTotals = balanceSheet.totals;

        if (queryCurrency) {
          resultAccounts = resultAccounts.filter((a) => a.currency === queryCurrency);
          resultTotals = resultTotals[queryCurrency] ? { [queryCurrency]: resultTotals[queryCurrency] } : {};
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                accounts: resultAccounts,
                totals: resultTotals,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to list accounts: ${error.message || error}` }],
        };
      }
    }
  );
}
