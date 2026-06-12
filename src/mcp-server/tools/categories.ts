import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";

export function registerCategoryTools(server: McpServer) {
  server.tool(
    "list_categories",
    "List all financial categories, optionally filtered by category type.",
    {
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional().describe("Filter by category type"),
    },
    async ({ type }) => {
      try {
        const where: any = {};
        if (type) where.type = type;

        const categories = await db.category.findMany({
          where,
          include: {
            rules: true,
            _count: { select: { transactions: true } },
          },
          orderBy: { name: "asc" },
        });

        const formatted = categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          cashFlowType: cat.cashFlowType,
          transactionsCount: cat._count.transactions,
          rules: cat.rules.map((r) => ({ id: r.id, pattern: r.pattern })),
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ categories: formatted }) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to list categories: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "create_category_rule",
    "Create a new payee keyword auto-matching rule for a category to automatically categorize all future CSV imports, and retroactively classify existing uncategorized transactions.",
    {
      pattern: z.string().describe("Keyword pattern to search for (e.g. 'Uber', 'Coles')"),
      categoryId: z.string().uuid().describe("Category ID to assign to matching transactions"),
    },
    async ({ pattern, categoryId }) => {
      try {
        const lowerPattern = pattern.trim().toLowerCase();
        if (!lowerPattern) {
          throw new Error('ERR_PATTERN_REQUIRED');
        }

        // Validate the category exists
        const category = await db.category.findUnique({ where: { id: categoryId } });
        if (!category) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found." }],
          };
        }

        // Check for duplicate patterns within the same category
        const sameCategoryRule = await db.categoryRule.findFirst({
          where: { pattern: lowerPattern, categoryId },
        });
        if (sameCategoryRule) {
          return {
            isError: true,
            content: [{ type: "text", text: "A rule with this pattern already exists for this category." }],
          };
        }

        // Check for same pattern in a different category (first-match-wins ambiguity)
        const conflictingRule = await db.categoryRule.findFirst({
          where: { pattern: lowerPattern, NOT: { categoryId } },
          include: { category: { select: { name: true } } },
        });
        if (conflictingRule) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Duplicate pattern detected: "${lowerPattern}" is already used by category "${conflictingRule.category.name}". ` +
                    `Duplicate patterns across categories can cause unpredictable matching — the first rule encountered wins. ` +
                    `Please delete the existing rule first or use a more specific pattern.`,
            }],
          };
        }

        const rule = await db.categoryRule.create({
          data: {
            pattern: lowerPattern,
            categoryId,
          },
        });

        // Automatically categorize existing uncategorized transactions matching this new rule
        const transactions = await db.transaction.findMany({
          where: { categoryId: null },
        });

        const matchedTxIds = transactions
          .filter((tx) => {
            const cleanPayee = tx.payee.toLowerCase();
            const cleanDesc = tx.description ? tx.description.toLowerCase() : '';
            return cleanPayee.includes(lowerPattern) || cleanDesc.includes(lowerPattern);
          })
          .map((tx) => tx.id);

        if (matchedTxIds.length > 0) {
          await db.transaction.updateMany({
            where: { id: { in: matchedTxIds } },
            data: {
              categoryId,
              isReviewed: true,
            },
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                rule: { id: rule.id, pattern: rule.pattern, categoryId: rule.categoryId },
                message: `Category rule created successfully for pattern: "${pattern}".`,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create category rule: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "create_category",
    "Create a new financial category (Income, Expense, or Transfer) with a specified Cash Flow statement section.",
    {
      name: z.string().describe("Name of the category (must be unique)"),
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).describe("Type of category"),
      cashFlowType: z.enum(["OPERATING", "INVESTING", "FINANCING"]).describe("Cash Flow Statement section the category belongs to"),
    },
    async ({ name, type, cashFlowType }) => {
      try {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category name is required." }],
          };
        }

        const existing = await db.category.findUnique({
          where: { name: trimmedName },
        });
        if (existing) {
          return {
            isError: true,
            content: [{ type: "text", text: `Category with name "${trimmedName}" already exists.` }],
          };
        }

        const category = await db.category.create({
          data: {
            name: trimmedName,
            type,
            cashFlowType,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                category: {
                  id: category.id,
                  name: category.name,
                  type: category.type,
                  cashFlowType: category.cashFlowType,
                },
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create category: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "update_category",
    "Update an existing financial category's name, type, or cash flow section.",
    {
      id: z.string().uuid().describe("Category ID to update"),
      name: z.string().describe("New category name"),
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).describe("New category type"),
      cashFlowType: z.enum(["OPERATING", "INVESTING", "FINANCING"]).describe("New cash flow section"),
    },
    async ({ id, name, type, cashFlowType }) => {
      try {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category name is required." }],
          };
        }

        const category = await db.category.findUnique({ where: { id } });
        if (!category) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found." }],
          };
        }

        // Protect Transfer category
        if (category.type === 'TRANSFER') {
          return {
            isError: true,
            content: [{ type: "text", text: "The default \"Transfer\" category is protected and cannot be modified." }],
          };
        }

        // Check unique name constraint (excluding self)
        const existing = await db.category.findFirst({
          where: { name: trimmedName, NOT: { id } },
        });
        if (existing) {
          return {
            isError: true,
            content: [{ type: "text", text: `Category with name "${trimmedName}" already exists.` }],
          };
        }

        const updated = await db.category.update({
          where: { id },
          data: { name: trimmedName, type, cashFlowType },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                category: {
                  id: updated.id,
                  name: updated.name,
                  type: updated.type,
                  cashFlowType: updated.cashFlowType,
                },
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to update category: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "delete_category",
    "Delete a financial category. Protected categories (Transfer) cannot be deleted. Uncategorizes associated transactions.",
    {
      id: z.string().uuid().describe("Category ID to delete"),
    },
    async ({ id }) => {
      try {
        const category = await db.category.findUnique({ where: { id } });
        if (!category) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found." }],
          };
        }

        // Protect Transfer category
        if (category.type === 'TRANSFER') {
          return {
            isError: true,
            content: [{ type: "text", text: "The default \"Transfer\" category is protected and cannot be deleted." }],
          };
        }

        await db.category.delete({ where: { id } });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Category "${category.name}" deleted successfully.`,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to delete category: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "delete_category_rule",
    "Delete a category match rule by its ID.",
    {
      id: z.string().uuid().describe("Rule ID to delete"),
    },
    async ({ id }) => {
      try {
        const rule = await db.categoryRule.findUnique({ where: { id } });
        if (!rule) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category rule not found." }],
          };
        }

        await db.categoryRule.delete({ where: { id } });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Category rule deleted successfully.`,
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to delete category rule: ${error.message || error}` }],
        };
      }
    }
  );
}
