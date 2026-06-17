import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateBalanceSheet } from "@/lib/reports";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
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

  server.tool(
    "create_account",
    "Create a new financial account (Asset or Liability) with a specified starting balance and native currency.",
    {
      name: z.string().describe("Display name for the account (e.g. 'Checking Account', 'Credit Card')"),
      type: z.enum(["ASSET", "LIABILITY"]).describe("Account type: Asset (bank accounts, investments) or Liability (credit cards, loans)"),
      startingBalance: z.number().optional().default(0).describe("Opening balance for the account (default: 0)"),
      currency: z.string().optional().default(DEFAULT_CURRENCY).describe(`ISO 4217 currency code (e.g. 'AUD', 'USD', 'EUR'). Default: '${DEFAULT_CURRENCY}'`),
    },
    async ({ name, type, startingBalance, currency }) => {
      try {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return {
            isError: true,
            content: [{ type: "text", text: "Account name is required." }],
          };
        }

        // Zod defaults guarantee these are defined, but guard for direct mock calls
        const balance = startingBalance ?? 0;
        const rawCurrency = currency ?? DEFAULT_CURRENCY;
        const currencyCode = rawCurrency.toUpperCase().trim();
        if (!currencyCode || currencyCode.length !== 3) {
          return {
            isError: true,
            content: [{ type: "text", text: `Invalid currency code "${rawCurrency}". Must be a 3-letter ISO 4217 code.` }],
          };
        }
        if (!SUPPORTED_CURRENCIES.has(currencyCode)) {
          return {
            isError: true,
            content: [{ type: "text", text: `Currency "${currencyCode}" is not supported.` }],
          };
        }

        // Prevent duplicate account names with case-insensitive comparison.
        // Prisma with SQLite only supports case-sensitive `=`, so we read all names
        // and compare via `.toLowerCase()` in JS. This is fine for personal finance
        // (< 100 accounts). 
        // Note: there is a TOCTOU race window here — two concurrent calls with the same
        // name could both pass the check. A DB-level UNIQUE constraint would be the
        // proper fix if this becomes an issue.
        const duplicateName = trimmedName.toLowerCase();
        const allAccounts = await db.account.findMany({ select: { name: true } });
        const existing = allAccounts.find((a) => a.name.toLowerCase() === duplicateName);
        if (existing) {
          return {
            isError: true,
            content: [{ type: "text", text: `An account with the name "${trimmedName}" already exists (as "${existing.name}").` }],
          };
        }

        const account = await db.account.create({
          data: {
            name: trimmedName,
            type,
            startingBalance: balance,
            currency: currencyCode,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                account: {
                  id: account.id,
                  name: account.name,
                  type: account.type,
                  startingBalance: account.startingBalance,
                  currency: account.currency,
                },
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create account: ${error.message || error}` }],
        };
      }
    }
  );
}
