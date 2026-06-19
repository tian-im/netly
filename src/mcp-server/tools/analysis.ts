import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { detectDuplicateGroups } from "@/lib/duplicates";

export function registerAnalysisTools(server: McpServer) {
  server.tool(
    "detect_duplicates",
    "Identify potential duplicate transactions based on date proximity, payee name similarity, and matching amounts.",
    {
      accountId: z.string().optional().describe("Filter checks to a specific account"),
      amountThreshold: z.number().optional().default(0.01).describe("Maximum absolute difference in amount"),
      daysThreshold: z.number().optional().default(3).describe("Maximum absolute difference in days"),
      maxResults: z.number().optional().default(100).describe("Maximum number of duplicates to return"),
      mode: z.enum(["historical", "import"]).optional().default("historical").describe("Detection mode: 'historical' (fuzzy date/amount/payee pairs) or 'import' (strict date/amount/payee groups for deduplicating CSV imports)"),
    },
    async ({ accountId, amountThreshold, daysThreshold, maxResults, mode }) => {
      try {
        const where: any = {};
        if (accountId) where.accountId = accountId;

        const transactions = await db.transaction.findMany({
          where,
          include: { account: true },
          orderBy: { date: "asc" },
        });

        const limit = maxResults ?? 100;
        const duplicates: { transaction1: any; transaction2: any; matchScore: number }[] = [];

        if (mode === "import") {
          const groups = detectDuplicateGroups(transactions as any, true);
          for (const group of groups) {
            if (duplicates.length >= limit) break;
            const original = group.transactions[0];
            for (let i = 1; i < group.transactions.length; i++) {
              if (duplicates.length >= limit) break;
              const tx = group.transactions[i];
              duplicates.push({
                transaction1: { id: original.id, date: original.date.toISOString(), payee: original.payee, amount: original.amount, account: original.account.name },
                transaction2: { id: tx.id, date: tx.date.toISOString(), payee: tx.payee, amount: tx.amount, account: tx.account.name },
                matchScore: 1.0,
              });
            }
          }
        } else {
          // Simple duplicate detection: O(N^2) over transactions but capped by index distances
          for (let i = 0; i < transactions.length; i++) {
            if (duplicates.length >= limit) break;
            const t1 = transactions[i];
            for (let j = i + 1; j < transactions.length; j++) {
              if (duplicates.length >= limit) break;
              const t2 = transactions[j];

              // Only compare within the same account (cross-account pairs are not duplicates)
              if (t1.accountId !== t2.accountId) continue;

              const timeDiff = Math.abs(t1.date.getTime() - t2.date.getTime()) / (1000 * 60 * 60 * 24);
              // Since sorted by date, we can break early if time difference exceeds threshold
              if (timeDiff > daysThreshold) break;

              const amountDiff = Math.abs(t1.amount - t2.amount);
              if (amountDiff > amountThreshold) continue;

              // Simple string matching score for payee names
              const p1 = t1.payee.toLowerCase().trim();
              const p2 = t2.payee.toLowerCase().trim();

              let matchScore = 0;
              if (p1 === p2) {
                matchScore = 1.0;
              } else if (p1.includes(p2) || p2.includes(p1)) {
                matchScore = 0.8;
              } else {
                // Check partial overlap
                const words1 = p1.split(/\s+/);
                const words2 = p2.split(/\s+/);
                const intersection = words1.filter((w) => words2.includes(w));
                if (intersection.length > 0) {
                  matchScore = 0.5;
                }
              }

              if (matchScore >= 0.5) {
                duplicates.push({
                  transaction1: { id: t1.id, date: t1.date.toISOString(), payee: t1.payee, amount: t1.amount, account: t1.account.name },
                  transaction2: { id: t2.id, date: t2.date.toISOString(), payee: t2.payee, amount: t2.amount, account: t2.account.name },
                  matchScore,
                });
              }
            }
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ duplicates }) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to detect duplicates: ${error.message || error}` }],
        };
      }
    }
  );

  server.tool(
    "identify_recurring_transactions",
    "Analyze and group historical transactions to identify recurring patterns (subscriptions, salary, rent). Note: merchants are grouped by the first word of their payee name.",
    {
      months: z.number().optional().default(6).describe("Lookback window in months"),
    },
    async ({ months }) => {
      try {
        const lookbackDate = new Date();
        lookbackDate.setMonth(lookbackDate.getMonth() - months);

        const transactions = await db.transaction.findMany({
          where: {
            date: { gte: lookbackDate },
          },
          include: { category: true, account: true },
          orderBy: { date: "asc" },
          // Cap at 50k records to prevent unbounded memory use on very old ledgers.
          // For a daily-transaction 5-year ledger this is ~1 825 records, well under limit.
          take: 50000,
        });

        // Group by payee normalized key
        const groups: Record<string, typeof transactions> = {};
        for (const tx of transactions) {
          // Normalize payee by stripping digits, dates, or symbols commonly appended (e.g. Uber *Pending -> uber)
          const normalized = tx.payee
            .toLowerCase()
            .replace(/[^a-z\s]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")[0]; // Take first word for rough merchant grouping

          if (normalized.length < 3) continue; // Skip too short words

          if (!groups[normalized]) {
            groups[normalized] = [];
          }
          groups[normalized].push(tx);
        }

        const recurring: any[] = [];

        for (const [merchant, txs] of Object.entries(groups)) {
          if (txs.length < 3) continue; // Need at least 3 occurrences

          // Calculate average interval in days
          const intervals: number[] = [];
          for (let i = 1; i < txs.length; i++) {
            const diffDays = (txs[i].date.getTime() - txs[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
            intervals.push(diffDays);
          }

          const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

          // Standard deviation of intervals to measure consistency
          const sqDiffs = intervals.map((val) => Math.pow(val - avgInterval, 2));
          const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / sqDiffs.length;
          const stdDev = Math.sqrt(avgSqDiff);

          // If standard deviation of interval is low, it indicates consistency
          if (stdDev < 5 || (avgInterval > 25 && avgInterval < 35 && stdDev < 8)) {
            let frequency = "irregular";
            if (avgInterval >= 6 && avgInterval <= 8) frequency = "weekly";
            else if (avgInterval >= 13 && avgInterval <= 15) frequency = "fortnightly";
            else if (avgInterval >= 27 && avgInterval <= 33) frequency = "monthly";
            else continue; // Filter out irregular intervals

            const amounts = txs.map((tx) => tx.amount);
            const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;

            // Confidence based on SD
            const confidence = stdDev === 0 ? 1.0 : Math.max(0.5, 1.0 - stdDev / 15);

            recurring.push({
              payee: txs[0].payee,
              merchantPattern: merchant,
              count: txs.length,
              frequency,
              averageAmount: Math.round(avgAmount * 100) / 100,
              category: txs[0].category?.name || "Uncategorized",
              categoryId: txs[0].categoryId,
              confidence: Math.round(confidence * 100) / 100,
              currency: txs[0].account.currency,
            });
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ recurring }) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to detect recurring transactions: ${error.message || error}` }],
        };
      }
    }
  );
}
