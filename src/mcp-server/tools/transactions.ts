import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseCSV, type ColumnMapping } from "@/lib/csv";
import { matchRule } from "@/lib/rules";
import { makeHash, disambiguateDescriptions } from "@/lib/import-utils";
import { seedDefaultCategoriesIfEmpty } from "@/lib/default-categories";

export function registerTransactionTools(server: McpServer) {
  server.tool(
    "import_csv",
    "Import transactions from CSV content into a ledger account. Automatically filters duplicates and runs categorization rules.",
    {
      csvContent: z.string().describe("Raw CSV file content"),
      accountId: z.string().uuid().describe("Target account ID"),
      columnMapping: z.object({
        date: z.string().describe("CSV header name for transaction date"),
        payee: z.string().describe("CSV header name for payee/merchant"),
        amount: z.string().optional().describe("CSV header name for single amount column"),
        debit: z.string().optional().describe("CSV header name for debit column"),
        credit: z.string().optional().describe("CSV header name for credit column"),
        description: z.string().optional().describe("CSV header name for description"),
      }).describe("When hasHeaders=true: CSV header names for each field. When hasHeaders=false: 0-based column indices as strings (e.g. '0', '1', '2')"),
      dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "auto"]).optional().default("auto").describe("Format to parse date columns"),
      hasHeaders: z.boolean().optional().default(true).describe("If true, columnMapping values are CSV header names. If false, they are 0-based column indices (e.g. '0', '1', '2')"),
    },
    async ({ csvContent, accountId, columnMapping, dateFormat, hasHeaders }) => {
      try {
        const account = await db.account.findUnique({ where: { id: accountId } });
        if (!account) {
          return {
            isError: true,
            content: [{ type: "text", text: `Target account not found: ${accountId}` }],
          };
        }

        // Auto-seed default categories on first import (same behavior as REST API)
        await seedDefaultCategoriesIfEmpty(db);

        const rules = await db.categoryRule.findMany({ include: { category: true } });

        const dateFormatHint = dateFormat === "auto" ? undefined : dateFormat;
        const parsedTx = parseCSV(csvContent, columnMapping as ColumnMapping, dateFormatHint, hasHeaders);

        if (parsedTx.length === 0) {
          return {
            content: [{ type: "text", text: JSON.stringify({ importedCount: 0, skippedCount: 0, uncategorizedCount: 0, message: "No transactions parsed." }) }],
          };
        }

        // Batch-level disambiguation: within a single CSV import, if two transactions
        // have the exact same (date, payee, amount, description), automatically append
        // " (2)", " (3)", etc. to the description to differentiate them.
        disambiguateDescriptions(parsedTx);

        const dates = parsedTx.map((tx) => tx.date.getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        const existingTransactions = await db.transaction.findMany({
          where: {
            accountId,
            date: { gte: minDate, lte: maxDate },
          },
        });

        const existingSet = new Set(
          existingTransactions.map((tx) => makeHash(tx.date, tx.payee, tx.amount, tx.description))
        );

        let importedCount = 0;
        let skippedCount = 0;
        let uncategorizedCount = 0;
        const newTransactionsData: Prisma.TransactionCreateManyInput[] = [];

        for (const tx of parsedTx) {
          const hash = makeHash(tx.date, tx.payee, tx.amount, tx.description);
          if (existingSet.has(hash)) {
            skippedCount++;
            continue;
          }

          const matchedCategoryId = matchRule(tx.payee, tx.description, rules);
          if (!matchedCategoryId) {
            uncategorizedCount++;
          }

          newTransactionsData.push({
            date: tx.date,
            payee: tx.payee,
            description: tx.description,
            amount: Math.round(tx.amount * 100) / 100,
            accountId,
            categoryId: matchedCategoryId,
            isReviewed: matchedCategoryId !== null,
          });
          importedCount++;
        }

        if (newTransactionsData.length > 0) {
          const batchSize = 100;
          await db.$transaction(async (prisma) => {
            for (let i = 0; i < newTransactionsData.length; i += batchSize) {
              const batch = newTransactionsData.slice(i, i + batchSize);
              await prisma.transaction.createMany({ data: batch });
            }
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                importedCount,
                skippedCount,
                uncategorizedCount,
                message: `Successfully imported ${importedCount} transactions. Skipped ${skippedCount} duplicates. ${uncategorizedCount} transactions require manual categorization.`,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Import failed: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "list_transactions",
    "Query and list ledger transactions with optional filters and sorting.",
    {
      accountId: z.string().optional().describe("Filter by account ID"),
      categoryId: z.string().optional().describe("Filter by category ID or use 'uncategorized' for transactions without a category"),
      search: z.string().optional().describe("Search term for payees and descriptions"),
      dateFrom: z.string().optional().describe("ISO date string for start period"),
      dateTo: z.string().optional().describe("ISO date string for end period"),
      isReviewed: z.boolean().optional().describe("Filter reviewed status"),
      page: z.number().optional().default(1).describe("Page number"),
      pageSize: z.number().optional().default(50).describe("Page size"),
      sortBy: z.enum(["date", "amount", "payee"]).optional().default("date").describe("Sort by field"),
      sortOrder: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort direction"),
      currency: z.string().optional().describe("Filter by account currency"),
    },
    async ({ accountId, categoryId, search, dateFrom, dateTo, isReviewed, page, pageSize, sortBy, sortOrder, currency }) => {
      try {
        const where: any = {};
        if (accountId) where.accountId = accountId;
        if (categoryId) {
          if (categoryId.toLowerCase() === "uncategorized") {
            where.categoryId = null;
          } else {
            where.categoryId = categoryId;
          }
        }
        if (search) {
          const cleanSearch = search.trim().toLowerCase();
          where.OR = [
            { payee: { contains: cleanSearch } },
            { description: { contains: cleanSearch } },
          ];
        }
        if (dateFrom || dateTo) {
          where.date = {};
          if (dateFrom) where.date.gte = new Date(dateFrom);
          if (dateTo) where.date.lte = new Date(dateTo);
        }
        if (isReviewed !== undefined) {
          where.isReviewed = isReviewed;
        }
        if (currency) {
          where.account = { currency: currency.toUpperCase() };
        }

        const currentPage = page ?? 1;
        const currentPageSize = pageSize ?? 50;

        const totalCount = await db.transaction.count({ where });

        let orderBy: any = { date: "desc" };
        if (sortBy && sortOrder) {
          orderBy = { [sortBy]: sortOrder };
        }

        const transactions = await db.transaction.findMany({
          where,
          include: { account: true, category: true },
          orderBy,
          skip: (currentPage - 1) * currentPageSize,
          take: currentPageSize,
        });

        const formatted = transactions.map((t) => ({
          id: t.id,
          date: t.date.toISOString(),
          payee: t.payee,
          description: t.description,
          amount: t.amount,
          accountName: t.account.name,
          accountId: t.accountId,
          currency: t.account.currency,
          categoryName: t.category?.name || "Uncategorized",
          categoryId: t.categoryId,
          isReviewed: t.isReviewed,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                transactions: formatted,
                totalCount,
                page: currentPage,
                pageSize: currentPageSize,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to query transactions: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "update_transaction_category",
    "Assign a category to multiple transactions. Can optionally create an auto-categorization rule for the merchant.",
    {
      transactionIds: z.array(z.string()).describe("List of transaction UUIDs to update"),
      categoryId: z.string().nullable().describe("Category ID to assign, or null to uncategorize"),
      createRule: z.boolean().optional().default(false).describe("If true, automatically creates a payee match rule based on the first transaction's payee"),
    },
    async ({ transactionIds, categoryId, createRule }) => {
      try {
        // Validate the category exists (only if assigning to a category, not nullifying)
        if (categoryId !== null) {
          const category = await db.category.findUnique({ where: { id: categoryId } });
          if (!category) {
            return {
              isError: true,
              content: [{ type: "text", text: "Category not found." }],
            };
          }
        }

        await db.transaction.updateMany({
          where: { id: { in: transactionIds } },
          data: {
            categoryId,
            isReviewed: categoryId !== null,
          },
        });

        let ruleCreated = false;
        if (createRule && categoryId && transactionIds.length > 0) {
          const firstTx = await db.transaction.findUnique({
            where: { id: transactionIds[0] },
          });
          if (firstTx && firstTx.payee) {
            const pattern = firstTx.payee.trim();
            const lowerPattern = pattern.toLowerCase();
            // Check for case-insensitive duplicates within the same category
            const sameCategoryRules = await db.categoryRule.findMany({
              where: { categoryId },
            });
            const isSameCategoryDuplicate = sameCategoryRules.some(
              (r) => r.pattern.toLowerCase() === lowerPattern
            );
            if (isSameCategoryDuplicate) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ updated: transactionIds.length, ruleCreated: false }),
                }],
              };
            }
            // Check for same pattern in a different category (first-match-wins ambiguity)
            const otherCategoryRules = await db.categoryRule.findMany({
              where: { NOT: { categoryId } },
              include: { category: { select: { name: true } } },
            });
            const conflictingRule = otherCategoryRules.find(
              (r) => r.pattern.toLowerCase() === lowerPattern
            );
            if (conflictingRule) {
              // Pattern exists in another category — don't create a conflicting rule
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ updated: transactionIds.length, ruleCreated: false }),
                }],
              };
            }
            await db.categoryRule.create({
              data: { pattern, categoryId },
            });
            ruleCreated = true;
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ updated: transactionIds.length, ruleCreated }) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to update categories: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "categorize_uncategorized",
    "Batch-categorize all CURRENTLY uncategorized transactions whose payee or description matches a keyword pattern. (Note: Use create_category_rule if you want a perpetual rule that automatically runs on all future CSV imports as well).",
    {
      pattern: z.string().describe("Keyword pattern to match against payee or description (case-insensitive)"),
      categoryId: z.string().uuid().describe("Category ID to assign to the matched transactions"),
      createRule: z.boolean().optional().default(false).describe("If true, creates a payee match rule so future imports are categorized automatically"),
    },
    async ({ pattern, categoryId, createRule }) => {
      try {
        const trimmedPattern = pattern.trim();
        if (!trimmedPattern) {
          return { isError: true, content: [{ type: "text", text: "Pattern is required." }] };
        }
        const storedPattern = trimmedPattern;
        const lowerPattern = trimmedPattern.toLowerCase();

        // Validate the category exists
        const category = await db.category.findUnique({ where: { id: categoryId } });
        if (!category) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found." }],
          };
        }

        // 1. Find all matching uncategorized transactions
        const matchedTransactions = await db.transaction.findMany({
          where: {
            categoryId: null,
            OR: [
              { payee: { contains: lowerPattern } },
              { description: { contains: lowerPattern } },
            ],
          },
        });
        const matchedTxIds = matchedTransactions.map((tx) => tx.id);

        // 2. Perform the update if there are matches
        if (matchedTxIds.length > 0) {
          await db.transaction.updateMany({
            where: { id: { in: matchedTxIds } },
            data: {
              categoryId,
              isReviewed: true,
            },
          });
        }

        // 3. Create the rule if requested and does not already exist (case-insensitive)
        let ruleCreated = false;
        if (createRule) {
          // Check for case-insensitive duplicates within the same category
          const sameCategoryRules = await db.categoryRule.findMany({
            where: { categoryId },
          });
          const isSameCategoryDuplicate = sameCategoryRules.some(
            (r) => r.pattern.toLowerCase() === lowerPattern
          );
          // Check for same pattern in a different category (first-match-wins ambiguity)
          const otherCategoryRules = await db.categoryRule.findMany({
            where: { NOT: { categoryId } },
            include: { category: { select: { name: true } } },
          });
          const conflictingRule = otherCategoryRules.find(
            (r) => r.pattern.toLowerCase() === lowerPattern
          );
          if (!isSameCategoryDuplicate && !conflictingRule) {
            await db.categoryRule.create({
              data: { pattern: storedPattern, categoryId },
            });
            ruleCreated = true;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                updatedCount: matchedTxIds.length,
                ruleCreated,
                message: `Successfully categorized ${matchedTxIds.length} transactions. Rule created: ${ruleCreated}.`,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to batch categorize transactions: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "delete_transactions",
    "Permanently delete multiple transactions by their IDs.",
    {
      transactionIds: z.array(z.string()).describe("List of transaction UUIDs to delete"),
    },
    async ({ transactionIds }) => {
      try {
        const deleted = await db.transaction.deleteMany({
          where: { id: { in: transactionIds } },
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                deletedCount: deleted.count,
                success: true,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to delete transactions: ${error.message || error}` }],
        };
      }
    }
  );
}
